"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var lodash = require("lodash");
var path = require("path");
var istanbul_1 = require("istanbul");
var Reporter = (function () {
    function Reporter(config, sharedProcessedFiles, threshold) {
        this.remap = require("remap-istanbul/lib/remap");
        this.writeReport = require("remap-istanbul/lib/writeReport");
        var self = this;
        // tslint:disable-next-line:only-arrow-functions
        this.create = function (logger) {
            var coverageMap;
            self.log = logger.create("reporter.karma-typescript");
            this.adapters = [];
            this.onRunStart = function () {
                coverageMap = new WeakMap();
            };
            this.onBrowserComplete = function (browser, result) {
                if (!result || !result.coverage) {
                    return;
                }
                coverageMap.set(browser, result.coverage);
            };
            this.onRunComplete = function (browsers, results) {
                browsers.forEach(function (browser) {
                    var coverage = coverageMap.get(browser);
                    var unmappedCollector = new istanbul_1.Collector();
                    if (!coverage) {
                        return;
                    }
                    unmappedCollector.add(coverage);
                    var sourceStore = istanbul_1.Store.create("memory");
                    config.remapOptions.sources = sourceStore;
                    config.remapOptions.readFile = function (filepath) {
                        return sharedProcessedFiles[filepath];
                    };
                    var collector = self.remap(unmappedCollector.getFinalCoverage(), config.remapOptions);
                    if (results && config.hasCoverageThreshold && !threshold.check(browser, collector)) {
                        results.exitCode = 1;
                    }
                    Promise
                        .all(Object.keys(config.reports)
                        .map(function (reportType) {
                        var destination = self.getReportDestination(browser, config.reports, reportType);
                        if (destination) {
                            self.log.debug("Writing coverage to %s", destination);
                        }
                        return self.writeReport(collector, reportType, {}, destination, sourceStore);
                    }))
                        .catch(function (error) {
                        self.log.error(error);
                    })
                        .then(function () {
                        collector.dispose();
                        coverageMap = null;
                    });
                });
            };
        };
        this.create.$inject = ["logger"];
    }
    Reporter.prototype.getReportDestination = function (browser, reports, reportType) {
        var reportConfig = reports[reportType];
        if (lodash.isPlainObject(reportConfig)) {
            return path.join(reportConfig.directory || "coverage", reportConfig.subdirectory || browser.name, reportConfig.filename || reportType);
        }
        if (lodash.isString(reportConfig) && reportConfig.length > 0) {
            return path.join(reportConfig, browser.name, reportType);
        }
        return null;
    };
    return Reporter;
}());
exports.Reporter = Reporter;
