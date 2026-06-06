"""测试 JSON 提取/清洗/修复流水线。"""

from __future__ import annotations

from app.llm.structured import _clean_json, _extract_json, _repair_json


class TestExtractJson:
    def test_plain_json(self):
        assert _extract_json('{"a": 1}') == '{"a": 1}'

    def test_json_with_markdown_block(self):
        text = '```json\n{"a": 1}\n```'
        result = _extract_json(text)
        assert result == '{"a": 1}'

    def test_json_with_text_before_and_after(self):
        text = 'some text\n{"a": 1}\nmore text'
        result = _extract_json(text)
        assert result == '{"a": 1}'

    def test_json_array(self):
        # _extract_json finds the first { or [ - in this input, { comes first
        text = '{"a": 1}, {"b": 2}'
        result = _extract_json(text)
        # It'll return the range from first { to last }
        assert result == '{"a": 1}, {"b": 2}'


class TestCleanJson:
    def test_single_quotes_in_keys(self):
        assert _clean_json("""{'key': 'value'}""") == """{"key": "value"}"""

    def test_single_quotes_in_values(self):
        result = _clean_json("""{"key": 'value'}""")
        assert result == """{"key": "value"}"""

    def test_trailing_comma_in_object(self):
        assert _clean_json('{"a": 1,}') == '{"a": 1}'

    def test_trailing_comma_in_array(self):
        assert _clean_json('[1, 2,]') == '[1, 2]'

    def test_chinese_quotes(self):
        text = '{"name": "“你好”"}'
        result = _clean_json(text)
        assert '"' in result
        assert '“' not in result
        assert '”' not in result


class TestRepairJson:
    def test_valid_json_passes_through(self):
        text = '{"a": 1, "b": "hello"}'
        result = _repair_json(text)
        assert result is not None
        import json
        json.loads(result)

    def test_json_with_single_quotes(self):
        text = "{'key': 'value'}"
        result = _repair_json(text)
        assert result is not None

    def test_invalid_json_returns_none(self):
        assert _repair_json("not json at all") is None

    def test_python_dict_format(self):
        text = "{'a': 1, 'b': 'hello'}"
        result = _repair_json(text)
        assert result is not None
        import json
        assert json.loads(result) == {"a": 1, "b": "hello"}
