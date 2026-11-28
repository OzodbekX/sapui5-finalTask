sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/m/MessageBox"],
  (Controller, MessageBox) => {
    "use strict";
    return Controller.extend("project1.controller.Base", {
      getRouter() {
        return this.getOwnerComponent().getRouter();
      },
      getModel(sName) {
        return this.getView().getModel(sName);
      },
      setModel(oModel, sName) {
        return this.getView().setModel(oModel, sName);
      },
      getResourceBundle() {
        return this.getOwnerComponent().getModel("i18n").getResourceBundle();
      },
      getAppViewModel() {
        return this.getOwnerComponent().getModel("appView");
      },
      getODataErrorText(err) {
        try {
          return JSON.parse(err.responseText || err.body).error.message.value;
        } catch {
          return err.message || err.statusText || "";
        }
      },
      confirmDiscardChanges() {
        const editMode = this.getAppViewModel().getProperty("/editMode");
        const model = this.getOwnerComponent().getModel("odataV2");
        if (!editMode || !model.hasPendingChanges()) {
          return Promise.resolve(true);
        }
        const bundle = this.getResourceBundle();
        return new Promise((resolve) => {
          MessageBox.confirm(bundle.getText("confirmDiscardText"), {
            title: bundle.getText("confirmDiscardTitle"),
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            emphasizedAction: MessageBox.Action.NO,
            onClose: (action) => resolve(action === MessageBox.Action.YES),
          });
        });
      },
    });
  },
);
