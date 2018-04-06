module.exports =
function setUpStarRatings() {
  for (const starRatingElement of document.getElementsByClassName('star-rating')) {
    new StarRatingView(starRatingElement);
  }
}

class StarRatingView {
  constructor(element) {
    this.element = element;
    this.size = element.dataset.size
    this.stars = [];

    const inputName = element.dataset.name;
    this.hiddenInput = document.createElement('input');
    this.hiddenInput.type = 'hidden';
    this.hiddenInput.name = inputName;
    this.element.appendChild(this.hiddenInput);

    for (let i = 0; i < 5; i++) {
      let star;

      if (inputName != null) {
        star = document.createElement('a');
        star.href = '#';
      } else {
        star = document.createElement('span');
      }

      if (this.size === "small") {
        star.className = 'star-rating--star-small'
      } else {
        star.className = 'star-rating--star';
      }

      element.appendChild(star);
      this.stars.push(star);
    }

    if (inputName != null) {
      element.addEventListener('click', this.handleClick.bind(this));
    }

    if (element.dataset.value != null) {
      this.hiddenInput.value = element.dataset.value;
      this.highlightForCurrentRating();
    }
  }

  handleClick(event) {
    event.preventDefault();
    const starIndex = this.stars.indexOf(event.target);
    const rating = starIndex + 1;
    if (rating === parseFloat(this.hiddenInput.value)) {
      this.hiddenInput.value = '';
    } else {
      this.hiddenInput.value = rating;
    }
    this.highlightForCurrentRating();
  }

  highlightForCurrentRating() {
    let index = parseFloat(this.hiddenInput.value) - 1;
    if (isNaN(index)) index = -1;

    for (let i = 0; i <= index; i++) {
      this.stars[i].classList.add('highlighted');
    }
    for (let i = Math.floor(index + 1); i < 5; i++) {
      this.stars[i].classList.remove('highlighted', 'half-highlighted');
    }
    if (index > Math.floor(index)) {
      this.stars[Math.floor(index) + 1].classList.add('half-highlighted');
    }
  }
}
