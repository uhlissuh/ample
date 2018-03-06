module.exports = class StarRatingView {
  constructor(element) {
    this.element = element;
    const inputName = element.dataset.name;

    this.radioButtons = [];
    this.labels = [];

    for (let i = 0; i < 5; i++) {
      const id = `star-rating-${inputName}-${i + 1}`

      const radioButton = document.createElement('input');
      radioButton.type = 'radio';
      radioButton.name = inputName;
      radioButton.value = i + 1;
      radioButton.className = 'star-rating-radio';
      radioButton.id = id;

      const label = document.createElement('label');
      label.className = 'star-rating-label';
      label.setAttribute('for', id);

      element.appendChild(radioButton);
      element.appendChild(label);
      this.radioButtons.push(radioButton);
      this.labels.push(label);
    }

    element.addEventListener('mouseover', this.handleMouseOver.bind(this));
    element.addEventListener('mouseout', this.handleMouseOut.bind(this));
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
    for (let i = index + 1; i < 5; i++) {
      this.labels[i].classList.remove('highlighted');
    }
  }
}
