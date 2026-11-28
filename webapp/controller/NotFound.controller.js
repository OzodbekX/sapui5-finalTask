sap.ui.define(["project1/controller/Base.controller"], (BaseController) => {
  "use strict";

  return BaseController.extend("project1.controller.NotFound", {
    onNavToMaster() {
      this.getAppViewModel().setProperty("/layout", "OneColumn");
      this.getRouter().navTo("master", {}, true);
    },
  });
});
