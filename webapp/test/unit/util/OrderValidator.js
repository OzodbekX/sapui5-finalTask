sap.ui.define(
  ["project1/util/OrderValidator", "sap/ui/core/library"],
  function (OrderValidator, coreLibrary) {
    "use strict";

    const { ValueState } = coreLibrary;
    const TEXTS = {
      required: "required",
      invalidDate: "invalidDate",
      requiredBeforeOrder: "requiredBeforeOrder",
    };

    function createInput(sValue) {
      return {
        state: ValueState.None,
        stateText: "",
        getValue: () => sValue,
        setValueState(s) {
          this.state = s;
        },
        setValueStateText(s) {
          this.stateText = s;
        },
      };
    }

    function createPicker(oDate, bValid = true) {
      const oPicker = createInput(oDate || !bValid ? "some date" : "");
      oPicker.getDateValue = () => oDate;
      oPicker.isValidValue = () => bValid;
      return oPicker;
    }

    QUnit.module("OrderValidator.validateText");

    QUnit.test("empty or blank input is an error", function (assert) {
      const oInput = createInput("   ");
      assert.notOk(OrderValidator.validateText(oInput, TEXTS));
      assert.strictEqual(oInput.state, ValueState.Error);
      assert.strictEqual(oInput.stateText, "required");
    });

    QUnit.test("filled input clears the error", function (assert) {
      const oInput = createInput("Alfreds");
      oInput.state = ValueState.Error;
      assert.ok(OrderValidator.validateText(oInput, TEXTS));
      assert.strictEqual(oInput.state, ValueState.None);
    });

    QUnit.module("OrderValidator.validateDate");

    QUnit.test("empty required date is an error", function (assert) {
      const oPicker = createPicker(null);
      assert.notOk(OrderValidator.validateDate(oPicker, TEXTS, true));
      assert.strictEqual(oPicker.stateText, "required");
    });

    QUnit.test("empty optional date is valid", function (assert) {
      const oPicker = createPicker(null);
      assert.ok(OrderValidator.validateDate(oPicker, TEXTS, false));
      assert.strictEqual(oPicker.state, ValueState.None);
    });

    QUnit.test("unparsable date is an error", function (assert) {
      const oPicker = createPicker(null, false);
      assert.notOk(OrderValidator.validateDate(oPicker, TEXTS, false));
      assert.strictEqual(oPicker.stateText, "invalidDate");
    });

    QUnit.module("OrderValidator.validateOrderForm");

    QUnit.test("valid form passes", function (assert) {
      const bValid = OrderValidator.validateOrderForm({
        textInputs: [createInput("a"), createInput("b")],
        orderPicker: createPicker(new Date(2024, 0, 1)),
        requiredPicker: createPicker(new Date(2024, 0, 10)),
        texts: TEXTS,
      });
      assert.ok(bValid);
    });

    QUnit.test("all empty text inputs are flagged, not just the first", function (assert) {
      const aInputs = [createInput(""), createInput(""), createInput("ok")];
      const bValid = OrderValidator.validateOrderForm({
        textInputs: aInputs,
        orderPicker: createPicker(new Date(2024, 0, 1)),
        requiredPicker: createPicker(null),
        texts: TEXTS,
      });
      assert.notOk(bValid);
      assert.deepEqual(
        aInputs.map((oInput) => oInput.state),
        [ValueState.Error, ValueState.Error, ValueState.None],
      );
    });

    QUnit.test("required date before order date is an error", function (assert) {
      const oRequired = createPicker(new Date(2024, 0, 1));
      const bValid = OrderValidator.validateOrderForm({
        textInputs: [createInput("a")],
        orderPicker: createPicker(new Date(2024, 0, 10)),
        requiredPicker: oRequired,
        texts: TEXTS,
      });
      assert.notOk(bValid);
      assert.strictEqual(oRequired.stateText, "requiredBeforeOrder");
    });
  },
);
