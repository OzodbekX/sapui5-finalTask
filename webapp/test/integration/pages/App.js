sap.ui.define(["sap/ui/test/Opa5"], function (Opa5) {
	"use strict";

	Opa5.createPageObjects({
		onTheAppPage: {
			actions: {},
			assertions: {
				iShouldSeeTheApp: function () {
					return this.waitFor({
						id: "layout",
						viewName: "App",
						success: function () {
							Opa5.assert.ok(true, "The FlexibleColumnLayout is displayed");
						},
						errorMessage: "Did not find the App view"
					});
				}
			}
		}
	});
});
