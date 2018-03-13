module.exports = class StarRatingView {
  constructor(element) {
    this.element = element;
    const inputName = element.dataset.name;
    this.ratingValue = element.dataset.value - 1;

    this.radioButtons = [];
    this.labels = [];

    for (let i = 0; i < 5; i++) {
      const label = document.createElement('label');
      label.className = 'star-rating-label';

      element.appendChild(label);
      this.labels.push(label);

      if (!this.ratingValue) {
        const id = `star-rating-${inputName}-${i + 1}`
        label.setAttribute('for', id);

        const radioButton = document.createElement('input');
        radioButton.type = 'radio';
        radioButton.name = inputName;
        radioButton.value = i + 1;
        radioButton.className = 'star-rating-radio';
        radioButton.id = id;

        element.appendChild(radioButton);
        this.radioButtons.push(radioButton);
      }
    }

    if (!this.ratingValue) {
      element.addEventListener('mouseover', this.handleMouseOver.bind(this));
      element.addEventListener('mouseout', this.handleMouseOut.bind(this));
    }

    if (this.ratingValue) {
      this.highlightThroughIndex(this.ratingValue);
    }
  }


  handleMouseOver(event) {
    const labelIndex = this.labels.indexOf(event.target);
    if (labelIndex >= 0) {
      this.highlightThroughIndex(labelIndex);
    }
  }

  handleMouseOut(event) {
    const selectedIndex = this.radioButtons.findIndex(button => button.checked);
    this.highlightThroughIndex(selectedIndex);
  }

  highlightThroughIndex(index) {
    for (let i = 0; i <= index; i++) {
      this.labels[i].classList.add('highlighted');
    }
    for (let i = Math.floor(index + 1); i < 5; i++) {
      this.labels[i].classList.remove('highlighted', 'half-highlighted');
    }
    if (index > Math.floor(index)) {
      this.labels[Math.floor(index) + 1].classList.add('half-highlighted');
    }
  }
}
