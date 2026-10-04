"use strict";
(self["webpackChunkghostrentals"] = self["webpackChunkghostrentals"] || []).push([["src_app_components_account_account_module_ts"],{

/***/ 2561:
/*!*********************************************************************!*\
  !*** ./src/app/components/account/account-placeholder.component.ts ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AccountPlaceholderComponent: () => (/* binding */ AccountPlaceholderComponent)
/* harmony export */ });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ 7580);

class AccountPlaceholderComponent {
  static {
    this.ɵfac = function AccountPlaceholderComponent_Factory(t) {
      return new (t || AccountPlaceholderComponent)();
    };
  }
  static {
    this.ɵcmp = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({
      type: AccountPlaceholderComponent,
      selectors: [["app-account-placeholder"]],
      decls: 5,
      vars: 0,
      consts: [[2, "padding", "60px 20px", "text-align", "center"]],
      template: function AccountPlaceholderComponent_Template(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "div", 0)(1, "h2");
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](2, "Account Module");
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](3, "p");
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](4, "This section (account) is not included in this source export.");
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]()();
        }
      },
      encapsulation: 2
    });
  }
}

/***/ }),

/***/ 7037:
/*!**************************************************************!*\
  !*** ./src/app/components/account/account-routing.module.ts ***!
  \**************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AccountRoutingModule: () => (/* binding */ AccountRoutingModule)
/* harmony export */ });
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/router */ 5072);
/* harmony import */ var _account_placeholder_component__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./account-placeholder.component */ 2561);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ 7580);




const routes = [{
  path: '**',
  component: _account_placeholder_component__WEBPACK_IMPORTED_MODULE_0__.AccountPlaceholderComponent
}];
class AccountRoutingModule {
  static {
    this.ɵfac = function AccountRoutingModule_Factory(t) {
      return new (t || AccountRoutingModule)();
    };
  }
  static {
    this.ɵmod = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineNgModule"]({
      type: AccountRoutingModule
    });
  }
  static {
    this.ɵinj = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineInjector"]({
      imports: [_angular_router__WEBPACK_IMPORTED_MODULE_2__.RouterModule.forChild(routes), _angular_router__WEBPACK_IMPORTED_MODULE_2__.RouterModule]
    });
  }
}
(function () {
  (typeof ngJitMode === "undefined" || ngJitMode) && _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵsetNgModuleScope"](AccountRoutingModule, {
    imports: [_angular_router__WEBPACK_IMPORTED_MODULE_2__.RouterModule],
    exports: [_angular_router__WEBPACK_IMPORTED_MODULE_2__.RouterModule]
  });
})();

/***/ }),

/***/ 6852:
/*!******************************************************!*\
  !*** ./src/app/components/account/account.module.ts ***!
  \******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AccountModule: () => (/* binding */ AccountModule)
/* harmony export */ });
/* harmony import */ var _angular_common__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @angular/common */ 316);
/* harmony import */ var _account_routing_module__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./account-routing.module */ 7037);
/* harmony import */ var _account_placeholder_component__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./account-placeholder.component */ 2561);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/core */ 7580);




class AccountModule {
  static {
    this.ɵfac = function AccountModule_Factory(t) {
      return new (t || AccountModule)();
    };
  }
  static {
    this.ɵmod = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdefineNgModule"]({
      type: AccountModule
    });
  }
  static {
    this.ɵinj = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdefineInjector"]({
      imports: [_angular_common__WEBPACK_IMPORTED_MODULE_3__.CommonModule, _account_routing_module__WEBPACK_IMPORTED_MODULE_0__.AccountRoutingModule]
    });
  }
}
(function () {
  (typeof ngJitMode === "undefined" || ngJitMode) && _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵsetNgModuleScope"](AccountModule, {
    declarations: [_account_placeholder_component__WEBPACK_IMPORTED_MODULE_1__.AccountPlaceholderComponent],
    imports: [_angular_common__WEBPACK_IMPORTED_MODULE_3__.CommonModule, _account_routing_module__WEBPACK_IMPORTED_MODULE_0__.AccountRoutingModule]
  });
})();

/***/ })

}]);
//# sourceMappingURL=src_app_components_account_account_module_ts.js.map