TEST 'Base uses THIS to call own method'
  VAR b : ComputeBase; END_VAR
  b(value := 5);
  ASSERT_EQ(b.result, 10);
END_TEST
