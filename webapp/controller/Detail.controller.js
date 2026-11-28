sap.ui.define(
  [
    "project1/controller/Base.controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/library",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/library",
    "project1/model/formatter",
    "project1/util/OrderValidator",
  ],
  (
    BaseController,
    JSONModel,
    mobileLibrary,
    MessageToast,
    MessageBox,
    coreLibrary,
    formatter,
    OrderValidator,
  ) => {
    "use strict";

    const { URLHelper } = mobileLibrary;
    const { ValueState } = coreLibrary;

    const ODATA_MODEL = "odataV2";
    const DELETE_GROUP_ID = "deleteOrder";
    const CREATE_HASH = "new";
    const FULL_SCREEN_QUERY = "full";
    const TEXT_INPUT_IDS = [
      "inpCustomer",
      "inpShipName",
      "inpZip",
      "inpCity",
      "inpCountry",
    ];
    const ORDER_DATE_ID = "dpOrdered";
    const REQUIRED_DATE_ID = "dpRequired";
    const FORM_INPUT_IDS = [...TEXT_INPUT_IDS, ORDER_DATE_ID, REQUIRED_DATE_ID];

    return BaseController.extend("project1.controller.Detail", {
      formatter,

      onInit() {
        this.setModel(
          new JSONModel({
            lineItemsTitle: "",
            totalPrice: 0,
            editMode: false,
            isNew: false,
          }),
          "detailView",
        );
        const router = this.getRouter();
        router.getRoute("master").attachPatternMatched(this._onMasterMatched, this);
        router.getRoute("object").attachPatternMatched(this._onObjectMatched, this);
        router.getRoute("create").attachPatternMatched(this._onCreateMatched, this);
      },

      _getODataModel() {
        return this.getOwnerComponent().getModel(ODATA_MODEL);
      },

      _getTexts() {
        const bundle = this.getResourceBundle();
        return {
          required: bundle.getText("requiredField"),
          invalidDate: bundle.getText("invalidDate"),
          requiredBeforeOrder: bundle.getText("requiredBeforeOrder"),
        };
      },

      _resetForm() {
        FORM_INPUT_IDS.forEach((id) => {
          const control = this.byId(id);
          if (control) {
            control.setValueState(ValueState.None);
            control.setValueStateText("");
          }
        });
      },

      _validateForm() {
        const byId = (id) => this.byId(id);
        return OrderValidator.validateOrderForm({
          textInputs: TEXT_INPUT_IDS.map(byId),
          orderPicker: byId(ORDER_DATE_ID),
          requiredPicker: byId(REQUIRED_DATE_ID),
          texts: this._getTexts(),
        });
      },

      _setMode(editMode, isNew) {
        const detailView = this.getModel("detailView");
        detailView.setProperty("/editMode", editMode);
        detailView.setProperty("/isNew", isNew);
        this.getAppViewModel().setProperty("/editMode", editMode);
      },

      _leaveDetail() {
        this._discardNewEntry();
        this._discardEdits();
        this._resetForm();
        this._setMode(false, false);
        this._currentOrderId = null;
      },

      _onMasterMatched() {
        this._leaveDetail();
      },

      _onObjectMatched(event) {
        const args = event.getParameter("arguments");
        const { objectId } = args;
        const fullScreen = args["?query"]?.layout === FULL_SCREEN_QUERY;
        this.getAppViewModel().setProperty(
          "/layout",
          fullScreen ? "MidColumnFullScreen" : "TwoColumnsMidExpanded",
        );

        if (objectId === this._currentOrderId) {
          return;
        }
        this._leaveDetail();
        this._currentOrderId = objectId;
        this.getModel("detailView").setProperty("/totalPrice", 0);
        this.byId("iconTabBar").setSelectedKey("shipping");

        const id = Number(objectId);
        if (!Number.isInteger(id)) {
          this._showNotFound();
          return;
        }

        const model = this._getODataModel();
        model.metadataLoaded().then(() => {
          const view = this.getView();
          view.bindElement({
            path: model.createKey("/Orders", { OrderID: id }),
            model: ODATA_MODEL,
            parameters: { expand: "Employee,Order_Details" },
            events: {
              dataRequested: () => view.setBusy(true),
              dataReceived: (dataEvent) => {
                view.setBusy(false);
                if (!dataEvent.getParameter("data")) {
                  this._showNotFound();
                }
              },
            },
          });
        });
      },

      async _onCreateMatched() {
        this.getAppViewModel().setProperty("/layout", "TwoColumnsMidExpanded");
        this._leaveDetail();

        const model = this._getODataModel();
        let orderId;
        try {
          await model.metadataLoaded();
          orderId = await this._getNextOrderId(model);
        } catch (err) {
          MessageBox.error(
            this.getResourceBundle().getText("createError", [
              this.getODataErrorText(err),
            ]),
          );
          return;
        }
        if (this.getRouter().getHashChanger().getHash() !== CREATE_HASH) {
          return;
        }

        this._oCtx = model.createEntry("/Orders", {
          properties: {
            OrderID: orderId,
            CustomerName: "",
            OrderDate: new Date(),
            RequiredDate: null,
            ShipName: "",
            ShipAddress: "",
            ShipCity: "",
            ShipPostalCode: "",
            ShipCountry: "",
          },
        });

        const view = this.getView();
        view.unbindElement(ODATA_MODEL);
        view.setBindingContext(this._oCtx, ODATA_MODEL);
        this._setMode(true, true);
        this.getModel("detailView").setProperty("/totalPrice", 0);
      },

      _getNextOrderId(model) {
        return new Promise((resolve, reject) => {
          model.read("/Orders", {
            urlParameters: {
              $top: 1,
              $orderby: "OrderID desc",
              $select: "OrderID",
            },
            success: (data) => resolve((data.results[0]?.OrderID ?? 0) + 1),
            error: reject,
          });
        });
      },

      _showNotFound() {
        this.getView().unbindElement(ODATA_MODEL);
        this._currentOrderId = null;
        this.getAppViewModel().setProperty("/layout", "TwoColumnsMidExpanded");
        this.getRouter().getTargets().display("notFound");
      },

      _discardNewEntry() {
        if (this._oCtx) {
          this._getODataModel().deleteCreatedEntry(this._oCtx);
          this._oCtx = null;
        }
      },

      _discardEdits() {
        if (this._editPath) {
          this._getODataModel().resetChanges([this._editPath], true);
          this._editPath = null;
        }
      },

      _closeDetail() {
        this._leaveDetail();
        this.getAppViewModel().setProperty("/layout", "OneColumn");
        this.getRouter().navTo("master");
      },

      _deleteOrder(path, orderId) {
        const model = this._getODataModel();
        const view = this.getView();
        const bundle = this.getResourceBundle();

        const deferred = model.getDeferredGroups();
        if (!deferred.includes(DELETE_GROUP_ID)) {
          model.setDeferredGroups([...deferred, DELETE_GROUP_ID]);
        }
        model.remove(path, { groupId: DELETE_GROUP_ID });

        const discardPending = () => model.resetChanges([path], true);
        const showError = (err) =>
          MessageBox.error(
            bundle.getText("deleteError", [this.getODataErrorText(err)]),
          );

        view.setBusy(true);
        model.submitChanges({
          groupId: DELETE_GROUP_ID,
          success: (data) => {
            view.setBusy(false);
            const failed = (data?.__batchResponses || []).filter(
              (r) => r.response && Number(r.response.statusCode) >= 400,
            );
            if (failed.length) {
              discardPending();
              showError(failed[0].response);
              return;
            }
            MessageToast.show(bundle.getText("deleteSuccess", [orderId]));
            view.unbindElement(ODATA_MODEL);
            this._currentOrderId = null;
            this.getAppViewModel().setProperty("/layout", "OneColumn");
            this.getRouter().navTo("master", {}, true);
          },
          error: (err) => {
            view.setBusy(false);
            discardPending();
            showError(err);
          },
        });
      },

      onSaveOrder() {
        if (!this._validateForm()) {
          return;
        }
        const view = this.getView();
        if (view.getBusy()) {
          return;
        }
        const model = this._getODataModel();
        const isNew = this.getModel("detailView").getProperty("/isNew");

        if (!model.hasPendingChanges()) {
          if (!isNew) {
            this._editPath = null;
            this._setMode(false, false);
          }
          return;
        }

        const bundle = this.getResourceBundle();
        const showError = (err) =>
          MessageBox.error(
            bundle.getText(isNew ? "createError" : "updateError", [
              this.getODataErrorText(err),
            ]),
          );

        view.setBusy(true);
        model.submitChanges({
          success: (data) => {
            view.setBusy(false);
            const failed = (data?.__batchResponses || []).filter(
              (r) => r.response && Number(r.response.statusCode) >= 400,
            );
            if (failed.length) {
              showError(failed[0].response);
              return;
            }
            this._resetForm();
            if (isNew) {
              const orderId = this._oCtx.getProperty("OrderID");
              this._oCtx = null;
              this._setMode(false, false);
              MessageToast.show(bundle.getText("createSuccess", [orderId]));
              this.getRouter().navTo("object", { objectId: orderId }, true);
              return;
            }
            const orderId = view
              .getBindingContext(ODATA_MODEL)
              .getProperty("OrderID");
            this._editPath = null;
            this._setMode(false, false);
            MessageToast.show(bundle.getText("updateSuccess", [orderId]));
          },
          error: (err) => {
            view.setBusy(false);
            showError(err);
          },
        });
      },

      onCancelOrder() {
        this._resetForm();
        if (this._oCtx) {
          this._closeDetail();
          return;
        }
        this._discardEdits();
        this._setMode(false, false);
      },

      onEditOrder() {
        const ctx = this.getView().getBindingContext(ODATA_MODEL);
        if (!ctx) {
          return;
        }
        this._editPath = ctx.getPath();
        this._resetForm();
        this._setMode(true, false);
      },

      onDeleteOrder() {
        const ctx = this.getView().getBindingContext(ODATA_MODEL);
        if (!ctx) {
          return;
        }
        const bundle = this.getResourceBundle();
        const orderId = ctx.getProperty("OrderID");

        MessageBox.confirm(bundle.getText("confirmDeleteOrder", [orderId]), {
          title: bundle.getText("confirmTitle"),
          actions: [MessageBox.Action.YES, MessageBox.Action.NO],
          emphasizedAction: MessageBox.Action.YES,
          onClose: (action) => {
            if (action === MessageBox.Action.YES) {
              this._deleteOrder(ctx.getPath(), orderId);
            }
          },
        });
      },

      onOrderInputLiveChange(event) {
        OrderValidator.validateText(event.getSource(), this._getTexts());
      },

      onOrderDateChange(event) {
        const picker = event.getSource();
        OrderValidator.validateDate(
          picker,
          this._getTexts(),
          picker.getId().endsWith(ORDER_DATE_ID),
        );
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
        if (!this._currentOrderId) {
          appView.setProperty(
            "/layout",
            isFull ? "TwoColumnsMidExpanded" : "MidColumnFullScreen",
          );
          return;
        }
        const params = { objectId: this._currentOrderId };
        if (!isFull) {
          params["?query"] = { layout: FULL_SCREEN_QUERY };
        }
        this.getRouter().navTo("object", params, true);
      },

      async onCloseDetail() {
        if (await this.confirmDiscardChanges()) {
          this._closeDetail();
        }
      },
    });
  },
);
