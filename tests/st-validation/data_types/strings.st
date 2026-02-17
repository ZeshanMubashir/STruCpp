FUNCTION_BLOCK StringHolder
  VAR_OUTPUT
    dblQuote : STRING;
    apostrophe : STRING;
    backslash : STRING;
    dblQuoteLen : INT;
    apostropheLen : INT;
    backslashLen : INT;
  END_VAR
  dblQuote := 'say "hello"';
  apostrophe := 'it''s working';
  backslash := 'C:\\Users\\test';
  dblQuoteLen := LEN(dblQuote);
  apostropheLen := LEN(apostrophe);
  backslashLen := LEN(backslash);
END_FUNCTION_BLOCK
