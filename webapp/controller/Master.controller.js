sap.ui.define(
  [
    "project1/controller/Base.controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "project1/model/formatter",
  ],
  (BaseController, JSONModel, Filter, FilterOperator, Sorter, formatter) => {
    "use strict";

    const ODATA_MODEL = "odataV2";

    return BaseController.extend("project1.controller.Master", {
      formatter,

      onInit() {
        this._searchFilters = [];
        this._dialogFilters = [];
        this._selectedOrderId = null;

        this.setModel(
          new JSONModel({
            title: this.getResourceBundle().getText("masterTitleNoCount"),
          }),
          "masterView",
        );

        const router = this.getRouter();
        router
          .getRoute("master")
          .attachPatternMatched(this._onMasterMatched, this);
        router
          .getRoute("object")
          .attachPatternMatched(this._onObjectMatched, this);
      },

      _getList() {
        return this.byId("ordersList");
      },

      _onMasterMatched() {
        this._selectedOrderId = null;
        this.getAppViewModel().setProperty("/layout", "OneColumn");
        this._getList().removeSelections(true);
      },

      _onObjectMatched(event) {
        this._selectedOrderId = event.getParameter("arguments").objectId;
        this._selectCurrentItem();
      },

      _selectCurrentItem() {
        if (!this._selectedOrderId) {
          return;
        }
        const list = this._getList();
        const item = list
          .getItems()
          .find(
            (listItem) =>
              String(
                listItem.getBindingContext(ODATA_MODEL)?.getProperty("OrderID"),
              ) === this._selectedOrderId,
          );
        if (item) {
          list.setSelectedItem(item);
        }
      },

      onUpdateFinished(event) {
        const total = event.getParameter("total");
        const bundle = this.getResourceBundle();
        this.getModel("masterView").setProperty(
          "/title",
          total
            ? bundle.getText("masterTitle", [total])
            : bundle.getText("masterTitleNoCount"),
        );
        this._selectCurrentItem();
      },

      onSelectionChange(event) {
        const ctx = event
          .getParameter("listItem")
          .getBindingContext(ODATA_MODEL);
        this.getRouter().navTo("object", {
          objectId: ctx.getProperty("OrderID"),
        });
      },

      onSearch(event) {
        if (event.getParameter("refreshButtonPressed")) {
          this._getList().getBinding("items").refresh();
          return;
        }
        const query = (event.getParameter("query") || "").trim();
        this._searchFilters = query
          ? [
              new Filter({
                path: "CustomerName",
                operator: FilterOperator.Contains,
                value1: query,
                caseSensitive: false,
              }),
            ]
          : [];
        this._applyFilters();
      },

      _applyFilters() {
        const groups = [];
        if (this._searchFilters.length) {
          groups.push(new Filter({ filters: this._searchFilters, and: false }));
        }
        if (this._dialogFilters.length) {
          groups.push(new Filter({ filters: this._dialogFilters, and: false }));
        }
        this._getList()
          .getBinding("items")
          .filter(
            groups.length ? new Filter({ filters: groups, and: true }) : [],
            "Application",
          );
      },

      _loadViewSettingsDialog() {
        if (!this._pViewSettings) {
          this._pViewSettings = this.loadFragment({
            name: "project1.view.fragments.ViewSettingsDialog",
          });
        }
        return this._pViewSettings;
      },

      async onOpenFilter() {
        (await this._loadViewSettingsDialog()).open("filter");
      },

      async onOpenGroup() {
        (await this._loadViewSettingsDialog()).open("group");
      },

      onConfirmViewSettings(event) {
        const {
          filterItems = [],
          groupItem,
          groupDescending,
        } = event.getParameters();

        this._dialogFilters = filterItems.map(
          (item) =>
            new Filter(
              item.getParent().getKey(),
              FilterOperator.EQ,
              item.getKey(),
            ),
        );

        const sorters = [];
        if (groupItem) {
          sorters.push(new Sorter(groupItem.getKey(), groupDescending, true));
        }
        sorters.push(new Sorter("OrderID", true));
        this._getList().getBinding("items").sort(sorters);

        this._applyFilters();
      },
    });
  },
);
