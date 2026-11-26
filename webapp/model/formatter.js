sap.ui.define(
  ["sap/ui/core/library", "sap/ui/core/format/NumberFormat"],
  (coreLibrary, NumberFormat) => {
    "use strict";
    const { ValueState } = coreLibrary;
    const amountFormat = NumberFormat.getFloatInstance({
      minFractionDigits: 2,
      maxFractionDigits: 2,
    });
    const isLate = (required, shiped) =>
      Boolean(required && shiped && shiped.getTime() > required.getTime());
    return {
      deliveryText(required, shipped) {
        const bundle = this.getResourceBundle();
        if (!shipped) {
          return bundle.getText("notShipped");
        }
        return bundle.getText(isLate(required, shipped) ? "urgent" : "inTime");
      },

      deliveryState(required, shipped) {
        if (!shipped) {
          return ValueState.None;
        }
        return isLate(required, shipped)
          ? ValueState.Warning
          : ValueState.Success;
      },

      lineTotal(unitPrice, quantity) {
        if (unitPrice == null || quantity == null) {
          return "";
        }
        return amountFormat.format(Number(unitPrice) * Number(quantity));
      },
    };
  },
);
