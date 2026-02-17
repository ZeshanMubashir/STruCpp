FUNCTION_BLOCK ComputeBase
  VAR_INPUT value : INT; END_VAR
  VAR_OUTPUT result : INT; END_VAR

  METHOD PUBLIC Compute : INT
    Compute := value * 2;
  END_METHOD

  result := THIS.Compute();
END_FUNCTION_BLOCK
