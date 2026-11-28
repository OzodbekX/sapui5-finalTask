sap.ui.define(["sap/ui/core/library"], (coreLibrary) => {
  "use strict";

  const { ValueState } = coreLibrary;

  const setError = (control, text) => {
    control.setValueState(ValueState.Error);
    control.setValueStateText(text);
  };

  const clearError = (control) => {
    control.setValueState(ValueState.None);
    control.setValueStateText("");
  };

  const validateText = (input, texts) => {
    if (!input.getValue().trim()) {
      setError(input, texts.required);
      return false;
    }
    clearError(input);
    return true;
  };

  const validateDate = (picker, texts, isRequired) => {
    if (!picker.getValue()) {
      if (isRequired) {
        setError(picker, texts.required);
        return false;
      }
      clearError(picker);
      return true;
    }
    if (!picker.isValidValue() || !picker.getDateValue()) {
      setError(picker, texts.invalidDate);
      return false;
    }
    clearError(picker);
    return true;
  };

  const validateOrderForm = ({ textInputs, orderPicker, requiredPicker, texts }) => {
    const textsOk = textInputs
      .map((input) => validateText(input, texts))
      .every(Boolean);
    const orderOk = validateDate(orderPicker, texts, true);
    const requiredOk = validateDate(requiredPicker, texts, false);

    if (
      orderOk &&
      requiredOk &&
      requiredPicker.getDateValue() &&
      requiredPicker.getDateValue() < orderPicker.getDateValue()
    ) {
      setError(requiredPicker, texts.requiredBeforeOrder);
      return false;
    }
    return textsOk && orderOk && requiredOk;
  };

  return {
    validateText,
    validateDate,
    validateOrderForm,
  };
});