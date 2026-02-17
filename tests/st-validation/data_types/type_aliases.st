TYPE
  MyInt : INT;
  MyReal : REAL;
END_TYPE

PROGRAM TypeAliasTest
  VAR
    a : MyInt;
    b : MyReal;
    intResult : INT;
    realResult : REAL;
  END_VAR
  a := 42;
  b := 3.14;
  intResult := a + 8;
  realResult := b * 2.0;
END_PROGRAM
