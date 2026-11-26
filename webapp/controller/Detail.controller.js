sap.ui.define(
  [
    "project1/controller/Base.controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/library",
    "project1/model/formatter",
  ],
  (BaseController, JSONModel, mobileLibrary, formatter) => {
    "use strict";

    const { URLHelper } = mobileLibrary;
    const ODATA_MODEL = "odataV2";

    return BaseController.extend("project1.controller.Detail", {
      formatter,

      onInit() {
        this.setModel(
          new JSONModel({ lineItemsTitle: "", totalPrice: 0 }),
          "detailView",
        );
        this.getRouter()
          .getRoute("object")
          .attachPatternMatched(this._onObjectMatched, this);
      },

      _onObjectMatched(event) {
        const { objectId } = event.getParameter("arguments");

        const appView = this.getAppViewModel();
        if (appView.getProperty("/layout") !== "MidColumnFullScreen") {
          appView.setProperty("/layout", "TwoColumnsMidExpanded");
        }
        this.byId("iconTabBar").setSelectedKey("shipping");

        const model = this.getOwnerComponent().getModel(ODATA_MODEL);
        model.metadataLoaded().then(() => {
          const path = model.createKey("/Orders", {
            OrderID: Number(objectId),
          });
          this.getView().bindElement({
            path,
            model: ODATA_MODEL,
            parameters: { expand: "Employee,Order_Details" },
          });
        });
      },

      onLineItemsUpdateFinished(event) {
        const total = event
          .getSource()
          .getItems()
          .reduce((sum, item) => {
            const ctx = item.getBindingContext(ODATA_MODEL);
            return (
              sum +
              Number(ctx.getProperty("UnitPrice")) *
                Number(ctx.getProperty("Quantity"))
            );
          }, 0);

        const detailView = this.getModel("detailView");
        detailView.setProperty("/totalPrice", total);
        detailView.setProperty(
          "/lineItemsTitle",
          this.getResourceBundle().getText("lineItemsTitle", [
            event.getParameter("total"),
          ]),
        );
      },

      onSendEmail() {
        const ctx = this.getView().getBindingContext(ODATA_MODEL);
        if (!ctx) {
          return;
        }
        const bundle = this.getResourceBundle();
        const orderId = ctx.getProperty("OrderID");
        URLHelper.triggerEmail(
          null,
          bundle.getText("emailSubject", [orderId]),
          bundle.getText("emailBody", [
            orderId,
            ctx.getProperty("CustomerName"),
          ]),
        );
      },

      onToggleFullScreen() {
        const appView = this.getAppViewModel();
        const isFull = appView.getProperty("/layout") === "MidColumnFullScreen";
        appView.setProperty(
          "/layout",
          isFull ? "TwoColumnsMidExpanded" : "MidColumnFullScreen",
        );
      },

      onCloseDetail() {
        this.getAppViewModel().setProperty("/layout", "OneColumn");
        this.getRouter().navTo("master");
      },
    });
  },
);
