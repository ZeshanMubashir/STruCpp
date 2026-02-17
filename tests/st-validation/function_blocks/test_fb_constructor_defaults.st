TEST 'FB input not ready after single call with high limit'
  VAR cfg : ConfigFB; END_VAR
  cfg(maxCount := 100);
  ASSERT_FALSE(cfg.ready);
END_TEST

TEST 'FB input ready when limit is 1'
  VAR cfg : ConfigFB; END_VAR
  cfg(maxCount := 1);
  ASSERT_TRUE(cfg.ready);
END_TEST
