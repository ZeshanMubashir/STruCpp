FUNCTION_BLOCK ConfigFB
  VAR_INPUT
    maxCount : INT;
  END_VAR
  VAR_OUTPUT
    ready : BOOL;
  END_VAR
  VAR
    counter : INT;
  END_VAR
  IF counter < maxCount THEN
    counter := counter + 1;
  END_IF;
  ready := counter >= maxCount;
END_FUNCTION_BLOCK
