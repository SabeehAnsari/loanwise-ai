"""save_application stores the explanation and message, and still saves on an
un-migrated database that lacks those columns."""
import httpx

import database

RESULT = {
    "status": "REJECTED_BY_RULES", "decision": "DENIED", "probability": None,
    "message": "Application rejected: minimum combined monthly income requirement is $500",
    "explanation": [{"feature": "Credit_History", "label": "Credit history", "impact": 1.2, "direction": "positive"}],
    "bias_report": None, "email": None, "marketing": None,
}
FORM = {"name": "Jane", "applicant_income": 100}


def _response(status, payload=None, text=""):
    req = httpx.Request("POST", "https://example.supabase.co/rest/v1/applications")
    if payload is not None:
        return httpx.Response(status, json=payload, request=req)
    return httpx.Response(status, text=text, request=req)


def test_new_fields_are_saved(monkeypatch):
    sent = []
    monkeypatch.setattr(database, "_insert",
                        lambda client, headers, record: sent.append(record) or _response(201, [{"id": "a1"}]))
    row = database.save_application("u1", "jane@example.com", FORM, RESULT, "token")
    assert row == {"id": "a1"}
    assert sent[0]["explanation"] == RESULT["explanation"]
    assert sent[0]["message"] == RESULT["message"]


def test_falls_back_when_columns_are_missing(monkeypatch):
    sent = []

    def fake_insert(client, headers, record):
        sent.append(record)
        if "explanation" in record:
            return _response(400, text="Could not find the 'explanation' column of 'applications'")
        return _response(201, [{"id": "a2"}])

    monkeypatch.setattr(database, "_insert", fake_insert)
    row = database.save_application("u1", "jane@example.com", FORM, RESULT, "token")
    assert row == {"id": "a2"}
    assert len(sent) == 2 and "explanation" not in sent[1] and "message" not in sent[1]
