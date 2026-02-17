TEST '2D array access'
  VAR uut : MultidimTest; END_VAR
  uut();
  ASSERT_EQ(uut.mResult, 42);
END_TEST

TEST 'Non-zero-based array ARRAY[3..7]'
  VAR uut : MultidimTest; END_VAR
  uut();
  ASSERT_EQ(uut.offResult, 99);
END_TEST

TEST '1-based array ARRAY[1..5]'
  VAR uut : MultidimTest; END_VAR
  uut();
  ASSERT_EQ(uut.oneResult, 30);
END_TEST

TEST 'Identity matrix via nested FOR loops'
  VAR uut : MultidimTest; END_VAR
  uut();
  ASSERT_EQ(uut.diagSum, 4);
END_TEST

TEST 'Mixed 1D and 2D access'
  VAR uut : MultidimTest; END_VAR
  uut();
  ASSERT_EQ(uut.mixedResult, 30);
END_TEST
