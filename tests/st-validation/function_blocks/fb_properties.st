FUNCTION_BLOCK MotorProp
  VAR _speed : INT; END_VAR

  PROPERTY Speed : INT
    GET
      Speed := _speed;
    END_GET
    SET
      IF Speed > 100 THEN
        _speed := 100;
      ELSE
        _speed := Speed;
      END_IF;
    END_SET
  END_PROPERTY
END_FUNCTION_BLOCK

FUNCTION_BLOCK ControllerProp
  VAR motor : MotorProp; END_VAR
END_FUNCTION_BLOCK
