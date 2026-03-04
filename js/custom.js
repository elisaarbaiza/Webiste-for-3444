 (function() {
  'use strict';

  var tinyslider = function() {
    var el = document.querySelectorAll('.testimonial-slider');

    if (el.length > 0) {
      var slider = tns({
        container: '.testimonial-slider',
        items: 1,
        axis: "horizontal",
        controlsContainer: "#testimonial-nav",
        swipeAngle: false,
        speed: 700,
        nav: true,
        controls: true,
        autoplay: true,
        autoplayHoverPause: true,
        autoplayTimeout: 3500,
        autoplayButtonOutput: false
      });
    }
  };
  tinyslider();

  var sitePlusMinus = function() {

    var value,
      quantity = document.getElementsByClassName('quantity-container');

    function createBindings(quantityContainer) {
      var quantityAmount = quantityContainer.getElementsByClassName('quantity-amount')[0];
      var increase = quantityContainer.getElementsByClassName('increase')[0];
      var decrease = quantityContainer.getElementsByClassName('decrease')[0];
      increase.addEventListener('click', function(e) { increaseValue(e, quantityAmount); });
      decrease.addEventListener('click', function(e) { decreaseValue(e, quantityAmount); });
    }

    function init() {
      for (var i = 0; i < quantity.length; i++) {
        createBindings(quantity[i]);
      }
    }

    function increaseValue(event, quantityAmount) {
      value = parseInt(quantityAmount.value, 10);
      value = isNaN(value) ? 0 : value;
      value++;
      quantityAmount.value = value;
    }

    function decreaseValue(event, quantityAmount) {
      value = parseInt(quantityAmount.value, 10);
      value = isNaN(value) ? 0 : value;
      if (value > 0) value--;
      quantityAmount.value = value;
    }

    init();
  };
  sitePlusMinus();

  // Favorites page interactions
  var favoritesPage = function() {
    var favoriteItems = document.querySelectorAll('.favorite-item');
    if (!favoriteItems.length) return;

    favoriteItems.forEach(function(item) {
      var productId = item.getAttribute('data-product-id') || '';
      var productName = item.getAttribute('data-product-name') || '';

      var url = window.location.origin + window.location.pathname + '?product=' + encodeURIComponent(productId);
      var shareLinkEl = item.querySelector('.favorite-share-link');
      if (shareLinkEl) {
        shareLinkEl.href = url;
        shareLinkEl.textContent = url;
      }

      var heartBtn = item.querySelector('.favorite-heart');
      if (heartBtn) {
        heartBtn.addEventListener('click', function() {
          item.parentNode.removeChild(item);
        });
      }

      var copyBtn = item.querySelector('.favorite-copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', function() {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url);
          } else {
            window.prompt('Copy this link', url);
          }
        });
      }
    });
  };
  favoritesPage();

 })();