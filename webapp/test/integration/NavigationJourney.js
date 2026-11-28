/*global QUnit*/

sap.ui.define([
	"sap/ui/test/opaQunit",
	"./pages/App",
	"./pages/Master",
	"./pages/NotFound"
], function (opaTest) {
	"use strict";

	QUnit.module("Navigation Journey");

	opaTest("Should see the orders list on start", function (Given, When, Then) {
		Given.iStartMyApp();

		Then.onTheAppPage.iShouldSeeTheApp();
		Then.onTheMasterPage.iShouldSeeTheOrdersList();

		Then.iTeardownMyApp();
	});

	opaTest("Should see NotFound for an order that does not exist", function (Given, When, Then) {
		Given.iStartMyApp({ hash: "Orders/99999" });

		Then.onTheNotFoundPage.iShouldSeeTheNotFoundMessage();

		Then.iTeardownMyApp();
	});

	opaTest("Should see NotFound for an unknown URL", function (Given, When, Then) {
		Given.iStartMyApp({ hash: "does/not/exist" });

		Then.onTheNotFoundPage.iShouldSeeTheNotFoundMessage();

		Then.iTeardownMyApp();
	});
});
