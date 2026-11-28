sap.ui.define(
  [
    "project1/controller/Detail.controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/thirdparty/sinon",
  ],
  function (Controller, JSONModel, sinon) {
    "use strict";

    const ORDER_PATH = "/Orders(7991)";

    function calledOnceWith(oSpy, ...aArgs) {
      return oSpy.calledOnce && oSpy.calledWith(...aArgs);
    }

    function routeEvent(oArguments) {
      return { getParameter: (sName) => (sName === "arguments" ? oArguments : undefined) };
    }

    QUnit.module("Detail Controller", {
      beforeEach: function () {
        this.sHash = "";
        this.oCreatedCtx = {
          getPath: () => "/Orders('tmp')",
          getProperty: () => 8000,
        };
        this.oModelStub = {
          createEntry: sinon.stub().returns(this.oCreatedCtx),
          deleteCreatedEntry: sinon.spy(),
          resetChanges: sinon.spy(),
          hasPendingChanges: sinon.stub().returns(true),
          submitChanges: sinon.spy(),
          metadataLoaded: () => Promise.resolve(),
          createKey: sinon.stub().returns(ORDER_PATH),
          read: (sPath, mParams) => mParams.success({ results: [{ OrderID: 7999 }] }),
        };
        this.oBoundCtx = {
          getPath: () => ORDER_PATH,
          getProperty: () => 7991,
        };
        this.oViewStub = {
          bindElement: sinon.spy(),
          unbindElement: sinon.spy(),
          setBindingContext: sinon.spy(),
          getBindingContext: () => this.oBoundCtx,
          getBusy: () => false,
          setBusy: sinon.spy(),
        };
        this.oRouterStub = {
          navTo: sinon.spy(),
          display: sinon.spy(),
          getTargets: () => ({ display: this.oRouterStub.display }),
          getHashChanger: () => ({ getHash: () => this.sHash }),
        };
        this.oControlStub = {
          setValueState: sinon.spy(),
          setValueStateText: sinon.spy(),
          setSelectedKey: sinon.spy(),
        };

        this.oDetailView = new JSONModel({ editMode: false, isNew: false, totalPrice: 0 });
        this.oAppView = new JSONModel({ layout: "OneColumn", editMode: false });

        this.oController = new Controller();
        this.oController.getView = () => this.oViewStub;
        this.oController.getModel = () => this.oDetailView;
        this.oController.getAppViewModel = () => this.oAppView;
        this.oController.getOwnerComponent = () => ({ getModel: () => this.oModelStub });
        this.oController.getRouter = () => this.oRouterStub;
        this.oController.byId = () => this.oControlStub;
        this.oController.getResourceBundle = () => ({ getText: (sKey) => sKey });
      },
    });

    QUnit.test("Edit then Cancel resets the order's changes and leaves edit mode", function (assert) {
      this.oController.onEditOrder();
      assert.strictEqual(this.oDetailView.getProperty("/editMode"), true, "edit mode on");
      assert.strictEqual(this.oAppView.getProperty("/editMode"), true, "shared edit flag on");

      this.oController.onCancelOrder();
      assert.ok(calledOnceWith(this.oModelStub.resetChanges, [ORDER_PATH], true), "changes reset");
      assert.strictEqual(this.oDetailView.getProperty("/editMode"), false, "edit mode off");
      assert.strictEqual(this.oAppView.getProperty("/editMode"), false, "shared edit flag off");
      assert.ok(this.oRouterStub.navTo.notCalled, "stays on the object page");
    });

    QUnit.test("Create, then browser Back to master discards the transient entry", async function (assert) {
      this.sHash = "new";
      await this.oController._onCreateMatched();
      assert.ok(calledOnceWith(this.oModelStub.createEntry, "/Orders"), "entry created");

      this.oController._onMasterMatched();
      assert.ok(
        calledOnceWith(this.oModelStub.deleteCreatedEntry, this.oCreatedCtx),
        "transient entry deleted",
      );
    });

    QUnit.test("Edit, then browser Back to master resets pending edits", function (assert) {
      this.oController.onEditOrder();
      this.oController._onMasterMatched();
      assert.ok(calledOnceWith(this.oModelStub.resetChanges, [ORDER_PATH], true));
    });

    QUnit.test("Leaving /new while the next ID loads does not create an entry", async function (assert) {
      this.sHash = "";
      await this.oController._onCreateMatched();
      assert.ok(this.oModelStub.createEntry.notCalled);
    });

    QUnit.test("Non-numeric ID shows NotFound without a request", function (assert) {
      this.oController._onObjectMatched(routeEvent({ objectId: "abc" }));
      assert.ok(calledOnceWith(this.oRouterStub.display, "notFound"));
      assert.ok(this.oViewStub.bindElement.notCalled);
    });

    QUnit.test("Order missing on the server shows NotFound", async function (assert) {
      this.oController._onObjectMatched(routeEvent({ objectId: "99999" }));
      await Promise.resolve();

      assert.ok(this.oViewStub.bindElement.calledOnce, "element bound");
      const { events } = this.oViewStub.bindElement.firstCall.args[0];
      events.dataReceived({ getParameter: () => undefined });
      assert.ok(calledOnceWith(this.oRouterStub.display, "notFound"));
    });

    QUnit.test("Existing order does not show NotFound", async function (assert) {
      this.oController._onObjectMatched(routeEvent({ objectId: "7991" }));
      await Promise.resolve();

      const { events } = this.oViewStub.bindElement.firstCall.args[0];
      events.dataReceived({ getParameter: () => ({ OrderID: 7991 }) });
      assert.ok(this.oRouterStub.display.notCalled);
    });

    QUnit.test("Full-screen query sets the layout without rebinding", async function (assert) {
      this.oController._onObjectMatched(routeEvent({ objectId: "7991" }));
      await Promise.resolve();
      this.oController._onObjectMatched(
        routeEvent({ objectId: "7991", "?query": { layout: "full" } }),
      );
      await Promise.resolve();

      assert.strictEqual(this.oAppView.getProperty("/layout"), "MidColumnFullScreen");
      assert.ok(this.oViewStub.bindElement.calledOnce, "bound only once");
    });

    QUnit.test("Toggling full screen puts the layout into the URL", async function (assert) {
      this.oController._onObjectMatched(routeEvent({ objectId: "7991" }));
      await Promise.resolve();
      this.oController.onToggleFullScreen();

      assert.ok(
        calledOnceWith(this.oRouterStub.navTo, 
          "object",
          { objectId: "7991", "?query": { layout: "full" } },
          true,
        ),
      );
    });

    QUnit.test("Invalid form is not submitted", function (assert) {
      this.oController._validateForm = () => false;
      this.oController.onSaveOrder();
      assert.ok(this.oModelStub.submitChanges.notCalled);
    });

    QUnit.test("Close asks before discarding and respects No", async function (assert) {
      this.oController.confirmDiscardChanges = () => Promise.resolve(false);
      await this.oController.onCloseDetail();
      assert.ok(this.oRouterStub.navTo.notCalled, "stays when user says No");

      this.oController.confirmDiscardChanges = () => Promise.resolve(true);
      await this.oController.onCloseDetail();
      assert.ok(calledOnceWith(this.oRouterStub.navTo, "master"), "closes when user says Yes");
      assert.strictEqual(this.oAppView.getProperty("/layout"), "OneColumn");
    });
  },
);
