FUNCTION_BLOCK Inner
  VAR_INPUT seed : INT; END_VAR
  VAR_OUTPUT val : INT; END_VAR
  METHOD PUBLIC GetVal : INT
    GetVal := val + seed;
  END_METHOD
END_FUNCTION_BLOCK

FUNCTION_BLOCK Outer
  VAR
    m : Inner;
    cached : INT;
  END_VAR
  METHOD PUBLIC ReadInner : INT
    ReadInner := m.GetVal();
  END_METHOD
END_FUNCTION_BLOCK
