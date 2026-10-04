"use strict";
(self["webpackChunkghostrentals"] = self["webpackChunkghostrentals"] || []).push([["src_app_components_contact_contact_module_ts"],{

/***/ 3569:
/*!*********************************************************************!*\
  !*** ./src/app/components/contact/contact-placeholder.component.ts ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ContactPlaceholderComponent: () => (/* binding */ ContactPlaceholderComponent)
/* harmony export */ });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ 7580);

class ContactPlaceholderComponent {
  static {
    this.ɵfac = function ContactPlaceholderComponent_Factory(t) {
      return new (t || ContactPlaceholderComponent)();
    };
  }
  static {
    this.ɵcmp = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({
      type: ContactPlaceholderComponent,
      selectors: [["app-contact-placeholder"]],
      decls: 5,
      vars: 0,
      consts: [[2, "padding", "60px 20px", "text-align", "center"]],
      template: function ContactPlaceholderComponent_Template(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "div", 0)(1, "h2");
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](2, "Contact Module");
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](3, "p");
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](4, "This section (contact) is not included in this source export.");
          _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]()();
        }
      },
      encapsulation: 2
    });
  }
}

/***/ }),

/***/ 6477:
/*!**************************************************************!*\
  !*** ./src/app/components/contact/contact-routing.module.ts ***!
  \**************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ContactRoutingModule: () => (/* binding */ ContactRoutingModule)
/* harmony export */ });
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/router */ 5072);
/* harmony import */ var _contact_placeholder_component__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./contact-placeholder.component */ 3569);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ 7580);




const routes = [{
  path: '**',
  component: _contact_placeholder_component__WEBPACK_IMPORTED_MODULE_0__.ContactPlaceholderComponent
}];
class ContactRoutingModule {
  static {
    this.ɵfac = function ContactRoutingModule_Factory(t) {
      return new (t || ContactRoutingModule)();
    };
  }
  static {
    this.ɵmod = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineNgModule"]({
      type: ContactRoutingModule
    });
  }
  static {
    this.ɵinj = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineInjector"]({
      imports: [_angular_router__WEBPACK_IMPORTED_MODULE_2__.RouterModule.forChild(routes), _angular_router__WEBPACK_IMPORTED_MODULE_2__.RouterModule]
    });
  }
}
(function () {
  (typeof ngJitMode === "undefined" || ngJitMode) && _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵsetNgModuleScope"](ContactRoutingModule, {
    imports: [_angular_router__WEBPACK_IMPORTED_MODULE_2__.RouterModule],
    exports: [_angular_router__WEBPACK_IMPORTED_MODULE_2__.RouterModule]
  });
})();

/***/ }),

/***/ 5108:
/*!******************************************************!*\
  !*** ./src/app/components/contact/contact.module.ts ***!
  \******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ContactModule: () => (/* binding */ ContactModule)
/* harmony export */ });
/* harmony import */ var _angular_common__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @angular/common */ 316);
/* harmony import */ var _contact_routing_module__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./contact-routing.module */ 6477);
/* harmony import */ var _contact_placeholder_component__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./contact-placeholder.component */ 3569);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/core */ 7580);




class ContactModule {
  static {
    this.ɵfac = function ContactModule_Factory(t) {
      return new (t || ContactModule)();
    };
  }
  static {
    this.ɵmod = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdefineNgModule"]({
      type: ContactModule
    });
  }
  static {
    this.ɵinj = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdefineInjector"]({
      imports: [_angular_common__WEBPACK_IMPORTED_MODULE_3__.CommonModule, _contact_routing_module__WEBPACK_IMPORTED_MODULE_0__.ContactRoutingModule]
    });
  }
}
(function () {
  (typeof ngJitMode === "undefined" || ngJitMode) && _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵsetNgModuleScope"](ContactModule, {
    declarations: [_contact_placeholder_component__WEBPACK_IMPORTED_MODULE_1__.ContactPlaceholderComponent],
    imports: [_angular_common__WEBPACK_IMPORTED_MODULE_3__.CommonModule, _contact_routing_module__WEBPACK_IMPORTED_MODULE_0__.ContactRoutingModule]
  });
})();

/***/ })

}]);
//# sourceMappingURL=src_app_components_contact_contact_module_ts.js.map