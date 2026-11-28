sap.ui.define(["sap/ui/test/Opa5"], function (Opa5) {
	"use strict";

	Opa5.createPageObjects({
		onTheMasterPage: {
			actions: {},
			assertions: {
				iShouldSeeTheOrdersList: function () {
					return this.waitFor({
						id: "ordersList",
						viewName: "Master",
						success: function (oList) {
							Opa5.assert.ok(oList.getItems().length > 0, "The orders list shows items");
						},
						errorMessage: "Did not find the orders list"
					});
				}
			}
		}
	});
});
