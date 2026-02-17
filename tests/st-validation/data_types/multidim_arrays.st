TYPE
  Matrix3x3 : ARRAY[0..2, 0..2] OF INT;
  OffsetArray : ARRAY[3..7] OF INT;
  OneBasedArray : ARRAY[1..5] OF INT;
  Matrix4x4 : ARRAY[1..4, 1..4] OF INT;
  Row5 : ARRAY[1..5] OF INT;
END_TYPE

PROGRAM MultidimTest
  VAR
    m : Matrix3x3;
    offArr : OffsetArray;
    oneArr : OneBasedArray;
    identity : Matrix4x4;
    row : Row5;
    i : INT;
    j : INT;
    mResult : INT;
    offResult : INT;
    oneResult : INT;
    diagSum : INT;
    mixedResult : INT;
  END_VAR

  (* 2D array access *)
  m[1, 2] := 42;
  mResult := m[1, 2];

  (* Non-zero-based array *)
  offArr[5] := 99;
  offResult := offArr[5];

  (* 1-based array *)
  FOR i := 1 TO 5 DO
    oneArr[i] := i * 10;
  END_FOR;
  oneResult := oneArr[3];

  (* Identity matrix via nested FOR *)
  FOR i := 1 TO 4 DO
    FOR j := 1 TO 4 DO
      IF i = j THEN
        identity[i, j] := 1;
      ELSE
        identity[i, j] := 0;
      END_IF;
    END_FOR;
  END_FOR;
  diagSum := identity[1, 1] + identity[2, 2] + identity[3, 3] + identity[4, 4];

  (* Mixed 1D bracket and 2D call syntax *)
  row[1] := 10;
  row[2] := 20;
  mixedResult := row[1] + row[2];
END_PROGRAM
