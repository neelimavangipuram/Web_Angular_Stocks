var myApp = angular.module('myApp', ["autoCompleteModule", "ui.bootstrap"]);

myApp.controller("searchSymbolController", function ($scope, $http) {
    $scope.getQuoteDisabled = true;
    $scope.containsFavList = true;

    $scope.selectedStock = {};
    $scope.favouriteStocks = [];
    $scope.isFavourite = false;

    // For the favourites sorting drop-down menus
    $scope.datapoints = ["Symbol", "Stock Price", "Change", "Volume"];
    $scope.selecteddatapoint = "Symbol";
    $scope.orders = ["Ascending", "Descending"];
    $scope.selectedorder = "Ascending";

    // For automatic refresh
    var automaticRefreshTime = 10 * 1000;    //5 seconds

    // For the auto-complete feature
    var vm = this;
    vm.inputSymbol = null;
    vm.autoCompleteOptions = {
        minimumChars: 1,
        data: function (term) {
            if (term == "") $scope.getQuoteDisabled = true;
            else $scope.getQuoteDisabled = false;
            return $http.get('/lookup?input=' + term)
                .then(function (response) {
                    term = term.toUpperCase();
                    var results = response.data;
                    var suggestions = [];
                    for (var i = 0; i < results.length; i++) {
                        console.log(results[i]);
                        suggestions.push(
                            results[i].Symbol + " - " +
                            results[i].Name + " (" +
                            results[i].Exchange + ")"
                        );
                    }
                    // return _.pluck(response.data, 'Symbol');
                    return suggestions;
                });
        }
    };

    $scope.currentStockDataReceived = false;
    $scope.currentStockProgressvalue = 0;
    var inputSymbol;
    var currentStockProgressInterval;
    $scope.getQuote = function () {
        $scope.currentStockProgressvalue += 5;
        currentStockProgressInterval = setInterval(function () {
            $scope.currentStockProgressvalue += 10;
        }, 250);
        inputSymbol = vm.inputSymbol.split(" - ")[0];
        console.log("inputSymbol", inputSymbol);
        $scope.isEnabled = false;
        $scope.selectedStock = null;
        $scope.containsFavList = false;
        var favourites = JSON.parse(localStorage.getItem("favourites") || "[]");
        const index = favourites.indexOf(inputSymbol);
        $scope.isFavourite = (index > -1) ? true : false;
        $http.get("/quote?symbol=" + inputSymbol)
            .then(function (response) {
                $scope.currentStockProgressvalue = 100;
                setTimeout(function () {
                    $scope.currentStockDataReceived = true;
                    $scope.selectedStock = response.data.table;
                    $scope.isEnabled = true;
                    $scope.priceSelected(response.data.chart);  //Render price chart
                    var favourites = JSON.parse(localStorage.getItem("favourites")) || [];
                    const index = favourites.indexOf($scope.selectedStock.Symbol);
                    if (index > -1) {
                        // Update the stock parameters again
                        $scope.deleteFavourite();
                        $scope.addToFavourites();
                    }
                    $scope.currentStockProgressvalue = 0;
                    clearInterval(currentStockProgressInterval);
                    $scope.$apply();
                }, 250);
            });
    };

    $scope.clear = function () {
        vm.inputSymbol = "";
        $scope.getQuoteDisabled = true;
    };

    // On load of page, update the favourites table
    $scope.updateFavouriteStocks = function () {
        console.log("update favourites");
        if (!$scope.favouriteStocks) $scope.favouriteStocks = [];
        var favouriteStocks = (localStorage.getItem("favourites") || "[]")
        $http.get("/favouriteStocks?symbols=" + favouriteStocks)
            .then(function (response) {
                $scope.favouriteStocks = response.data;
                $scope.sortFavourites();
            });
    }
    $scope.updateFavouriteStocks();

    // For deleting a favourite stock
    $scope.deleteFavourite = function (stock) {
        console.log("deleting this stock", stock);
        stock = (stock || $scope.selectedStock.Symbol);
        var favourites = JSON.parse(localStorage.getItem("favourites")) || [];
        favourites = _.without(favourites, _.findWhere(favourites, stock));
        localStorage.setItem("favourites", JSON.stringify(favourites));
        $scope.isFavourite = false;
        // $scope.updateFavouriteStocks();
        var allStocks = [];
        for (var i = 0; i < $scope.favouriteStocks.length; i++) {
            if ($scope.favouriteStocks[i].Symbol !== stock) {
                allStocks.push($scope.favouriteStocks[i]);
            }
        }
        $scope.favouriteStocks = allStocks;
    };

    // To add a stock to favourites (Store in local storage)
    $scope.addToFavourites = function () {
        var favourites = JSON.parse(localStorage.getItem("favourites")) || [];
        const index = favourites.indexOf($scope.selectedStock.Symbol);
        if (index === -1) {
            favourites.push($scope.selectedStock.Symbol);
            localStorage.setItem("favourites", JSON.stringify(favourites));
        }
        $scope.isFavourite = true;
    };

    $scope.sortFavourites = function () {
        var selecteddatapoint = (($scope.selecteddatapoint === "Stock Price") ? "LastPrice" : $scope.selecteddatapoint);
        if ($scope.selectedorder === "Ascending") {
            $scope.favouriteStocks = _.sortBy($scope.favouriteStocks, selecteddatapoint);
        } else {
            $scope.favouriteStocks = _.sortBy($scope.favouriteStocks, selecteddatapoint).reverse();
        }
    };

    var toggleCount = 0;
    var autoRefresh = null;
    $('#toggle-event').change(function () {
        toggleCount = ((toggleCount + 1) % 2);
        if (toggleCount == 1) {
            autoRefresh = setInterval(function () {
                $scope.updateFavouriteStocks();
            }, automaticRefreshTime);
        } else {
            clearInterval(autoRefresh);
        }
    });

    // To share stock details on Facebook    
    $scope.shareOnFacebook = function () {
        alert("Share this stock on Facebook");
    };

    $scope.getChangePercent = function (x) {
        if ($scope.selectedStock) {
            var change = x.Change;
            var changePercent = ((change / x.LastPrice) * 100.00).toFixed(2);
            return change + " ( " + changePercent + "% )";
        }
    };

    //Tab Selection for Price Highcharts
    $scope.priceSelected = function (chartDataPrice) {
        if (!chartDataPrice) return;
        var price_data = chartDataPrice.priceValues;
        var max_price = chartDataPrice.max_price;
        var min_price = chartDataPrice.min_price;
        var volume_data = chartDataPrice.volumeValues;
        var max_volume = chartDataPrice.max_volume;
        var allDates = chartDataPrice.allDates;

        Highcharts.chart('priceGraph', {
            chart: {
                zoomType: 'xy',
                borderColor: 'gray',
                borderWidth: 1,
                width: 450,
                marginRight: 10
            },
            title: {
                text: 'Stock Price' + ' ' + '(' + new Date(Date.now()).toLocaleString().slice(0, 9) + ')'
            },

            subtitle: {
                text: 'Source: <a href="https://www.alphavantage.co/"> Alpha Vantage</a>',
                style: {
                    color: "#0000ff"
                }
            },

            xAxis: [{
                categories: allDates,
                crosshair: true,
                tickInterval: 7,
                labels: {
                    rotation: -45
                },
            }],
            yAxis: [{ // Primary yAxis
                min: min_price,
                max: max_price,
                labels: {
                    format: '{value}$',
                    style: {
                        color: Highcharts.getOptions().colors[1]
                    }
                },
                title: {
                    text: 'Stock Price',
                    style: {
                        color: Highcharts.getOptions().colors[1]
                    }
                }
            }, { // Secondary yAxis
                max: max_volume * 5,
                title: {
                    text: 'Volume',
                    style: {
                        color: Highcharts.getOptions().colors[1]
                    }
                },
                labels: {
                    pointFormat: "Value: {point.y:,.0f}",
                    style: {
                        color: Highcharts.getOptions().colors[1]
                    }
                },
                opposite: true
            }],
            // legend: {
            //     layout: 'vertical',
            //     align: 'bottom',
            //     verticalAlign: 'top',
            //     x: 0,
            //     y: 200,
            //     backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF'
            // },
            plotOptions: {
                series: {
                    marker: {
                        enabled: false
                    }
                }
            },
            series: [{
                name: inputSymbol,
                type: 'area',
                color: '#FF0000',
                fillOpacity: 0.5,
                data: price_data,
                tooltip: {
                    valueSuffix: '$'
                }
            },
            {
                name: inputSymbol + 'Volume',
                type: 'column',
                yAxis: 1,
                color: 'white',
                data: volume_data,

            }]
        });
    };

    $scope.newsTabClicked = function () {
        $http.get("/news?symbol=" + inputSymbol)
            .then(function (response) {
                console.log('News Feed ', response.data);
                $scope.newsfeeds = response.data;
            });
    };
});