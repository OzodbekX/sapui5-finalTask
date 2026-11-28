sap.ui.define(
  ["project1/model/formatter", "sap/ui/core/library"],
  function (formatter, coreLibrary) {
    "use strict";

    const { ValueState } = coreLibrary;
    const oController = {
      getResourceBundle: () => ({ getText: (sKey) => sKey }),
    };

    QUnit.module("formatter");

    QUnit.test("deliveryText", function (assert) {
      const fn = formatter.deliveryText.bind(oController);
      const oRequired = new Date(2024, 0, 10);
      assert.strictEqual(fn(oRequired, null), "notShipped");
      assert.strictEqual(fn(oRequired, new Date(2024, 0, 5)), "inTime");
      assert.strictEqual(fn(oRequired, new Date(2024, 0, 15)), "urgent");
    });

    QUnit.test("deliveryState", function (assert) {
      const oRequired = new Date(2024, 0, 10);
      assert.strictEqual(formatter.deliveryState(oRequired, null), ValueState.None);
      assert.strictEqual(
        formatter.deliveryState(oRequired, new Date(2024, 0, 5)),
        ValueState.Success,
      );
      assert.strictEqual(
        formatter.deliveryState(oRequired, new Date(2024, 0, 15)),
        ValueState.Warning,
      );
    });

    QUnit.test("lineTotal", function (assert) {
      assert.strictEqual(formatter.lineTotal(null, 2), "");
      assert.ok(formatter.lineTotal("2.5", 4).startsWith("10"));
    });

    QUnit.test("initials", function (assert) {
      assert.strictEqual(formatter.initials("Andrew", "Fuller"), "AF");
      assert.strictEqual(formatter.initials("nancy", null), "N");
      assert.strictEqual(formatter.initials(undefined, undefined), "");
    });
  },
);
