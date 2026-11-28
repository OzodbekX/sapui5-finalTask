sap.ui.define(["sap/ui/test/Opa5"], function (Opa5) {
	"use strict";

	Opa5.createPageObjects({
		onTheNotFoundPage: {
			actions: {},
			assertions: {
				iShouldSeeTheNotFoundMessage: function () {
					return this.waitFor({
						id: "notFoundMessage",
						viewName: "NotFound",
						success: function () {
							Opa5.assert.ok(true, "The NotFound message is displayed");
						},
						errorMessage: "Did not find the NotFound message"
					});
				}
			}
		}
	});
});
