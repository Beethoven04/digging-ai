"""Unit tests for finder.emails: the pure logic that decides which address is tried for a person."""
import pytest

from finder import emails


@pytest.mark.parametrize("addr, expected", [
    ("info@acme.io", True),
    ("hello@acme.io", True),
    ("careers.se@acme.io", True),      # base before the dot is a role word
    ("no-reply@acme.io", True),
    ("anna@acme.io", False),
    ("anna.berg@acme.io", False),
])
def test_is_role(addr, expected):
    assert emails.is_role(addr) is expected


def test_extract_plain_obfuscated_and_cloudflare():
    # Cloudflare email protection: key 0x42 XOR "bo@x.se"
    key = 0x42
    cf = f"{key:02x}" + "".join(f"{ord(c) ^ key:02x}" for c in "bo@x.se")
    html = (
        '<a href="mailto:Anna.Berg@Acme.io">mail</a>'
        " lars [at] acme [dot] io "
        f'<span data-cfemail="{cf}"></span>'
        " logo@2x.png  test@example.com "
    )
    found = emails.extract_emails(html)
    assert "anna.berg@acme.io" in found
    assert "lars@acme.io" in found
    assert "bo@x.se" in found
    assert not any(e.endswith(".png") for e in found), "image file names are not addresses"
    assert "test@example.com" not in found, "placeholder domains are dropped"


@pytest.mark.parametrize("raw, expected", [
    ("Bjørn Ærø", "bjorn aero"),
    ("Åsa Öberg", "asa oberg"),
    ("José", "jose"),
])
def test_ascii_name_maps_nordic_letters(raw, expected):
    assert emails.ascii_name(raw) == expected


def test_name_parts_hyphenated_surname():
    assert emails.name_parts("Anders", "Kofod-Petersen") == ("anders", "petersen", "kofod-petersen")


@pytest.mark.parametrize("fmt, expected", [
    ("first", "anna"),
    ("first.last", "anna.berg"),
    ("flast", "aberg"),
    ("f.last", "a.berg"),
    ("firstl", "annab"),
    ("last.first", "berg.anna"),
])
def test_build_formats(fmt, expected):
    assert emails.build(fmt, "Anna", "Berg") == expected


def test_build_needs_last_name_except_first_format():
    assert emails.build("first.last", "Anna", "") == ""
    assert emails.build("first", "Anna", "") == "anna"


def test_infer_format_majority_vote():
    known = [
        ("anna.berg@acme.io", "Anna", "Berg"),
        ("lars.holm@acme.io", "Lars", "Holm"),
        ("bo@acme.io", "Bo", "Ek"),          # one outlier
    ]
    assert emails.infer_format(known) == "first.last"


def test_infer_format_unknown_people():
    assert emails.infer_format([("xyz@acme.io", "Anna", "Berg")]) is None


@pytest.mark.parametrize("local, shape", [
    ("anna.berg", "first.last"),
    ("a.berg", "f.last"),
    ("anna_berg", "first_last"),
    ("ab", "initials"),
    ("anna", "single"),
])
def test_local_shape(local, shape):
    assert emails.local_shape(local) == shape
