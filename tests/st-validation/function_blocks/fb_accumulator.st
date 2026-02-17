FUNCTION_BLOCK AccumulatorFB
  VAR_INPUT inc : INT; END_VAR
  VAR total : INT; END_VAR
  VAR_OUTPUT result : INT; END_VAR
  total := total + inc;
  result := total;
END_FUNCTION_BLOCK
