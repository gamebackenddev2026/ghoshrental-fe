"use strict";
(self["webpackChunkghostrentals"] = self["webpackChunkghostrentals"] || []).push([["src_app_components_auth_auth_module_ts"],{

/***/ 2331:
/*!***************************************************************!*\
  !*** ./src/app/components/auth/auth-placeholder.component.ts ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AuthPlaceholderComponent: () => (/* binding */ AuthPlaceholderComponent)
/* harmony export */ });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ 7580);

class AuthPlaceholderComponent {
  static {
    this.ɵfac = function AuthPlaceholderComponent_Factory(t) {
      return new (t || AuthPlaceholderComponent)();
    };
  }
  static {
    this.ɵcmp = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({
      type: AuthPlaceholderComponent,
      selectors: [["app-auth-placeholder"]],
      decls: 5,
      vars: 0,
      consts: [[2, "padding", "60px 20px", "text-align", "center"]],
      template: function AuthPlaceholderComponent_Template(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "div", 0)(1, "h2");
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](2, "Auth Module");
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](3, "p");
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](4, "This section (auth) is not included in this source export.");
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]()();
        }
      },
      encapsulation: 2
    });
  }
}

/***/ }),

/***/ 4855:
/*!********************************************************!*\
  !*** ./src/app/components/auth/auth-routing.module.ts ***!
  \********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AuthRoutingModule: () => (/* binding */ AuthRoutingModule)
/* harmony export */ });
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/router */ 5072);
/* harmony import */ var _auth_placeholder_component__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./auth-placeholder.component */ 2331);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ 7580);




const routes = [{
  path: '**',
  component: _auth_placeholder_component__WEBPACK_IMPORTED_MODULE_0__.AuthPlaceholderComponent
}];
class AuthRoutingModule {
  static {
    this.ɵfac = function AuthRoutingModule_Factory(t) {
      return new (t || AuthRoutingModule)();
    };
  }
  static {
    this.ɵmod = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineNgModule"]({
      type: AuthRoutingModule
    });
  }
  static {
    this.ɵinj = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineInjector"]({
      imports: [_angular_router__WEBPACK_IMPORTED_MODULE_2__.RouterModule.forChild(routes), _angular_router__WEBPACK_IMPORTED_MODULE_2__.RouterModule]
    });
  }
}
(function () {
  (typeof ngJitMode === "undefined" || ngJitMode) && _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵsetNgModuleScope"](AuthRoutingModule, {
    imports: [_angular_router__WEBPACK_IMPORTED_MODULE_2__.RouterModule],
    exports: [_angular_router__WEBPACK_IMPORTED_MODULE_2__.RouterModule]
  });
})();

/***/ }),

/***/ 4102:
/*!************************************************!*\
  !*** ./src/app/components/auth/auth.module.ts ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AuthModule: () => (/* binding */ AuthModule)
/* harmony export */ });
/* harmony import */ var _angular_common__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @angular/common */ 316);
/* harmony import */ var _auth_routing_module__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./auth-routing.module */ 4855);
/* harmony import */ var _auth_placeholder_component__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./auth-placeholder.component */ 2331);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/core */ 7580);




class AuthModule {
  static {
    this.ɵfac = function AuthModule_Factory(t) {
      return new (t || AuthModule)();
    };
  }
  static {
    this.ɵmod = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdefineNgModule"]({
      type: AuthModule
    });
  }
  static {
    this.ɵinj = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdefineInjector"]({
      imports: [_angular_common__WEBPACK_IMPORTED_MODULE_3__.CommonModule, _auth_routing_module__WEBPACK_IMPORTED_MODULE_0__.AuthRoutingModule]
    });
  }
}
(function () {
  (typeof ngJitMode === "undefined" || ngJitMode) && _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵsetNgModuleScope"](AuthModule, {
    declarations: [_auth_placeholder_component__WEBPACK_IMPORTED_MODULE_1__.AuthPlaceholderComponent],
    imports: [_angular_common__WEBPACK_IMPORTED_MODULE_3__.CommonModule, _auth_routing_module__WEBPACK_IMPORTED_MODULE_0__.AuthRoutingModule]
  });
})();

/***/ })

}]);
//# sourceMappingURL=src_app_components_auth_auth_module_ts.js.map