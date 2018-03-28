module.exports = class StarRatingView {
  constructor(element, interactive) {
    this.element = element;
    const inputName = element.dataset.name;
    if (element.dataset.value != null) {
      this.ratingValue = parseInt(element.dataset.value) - 1;
    } else {
      this.ratingValue = null;
    }

    this.size = element.dataset.size

    this.radioButtons = [];
    this.labels = [];

    for (let i = 0; i < 5; i++) {
      const label = document.createElement('label');

      if (this.size === "small") {
        label.className = 'star-rating-label-small'
      } else {
        label.className = 'star-rating-label';
      }

      element.appendChild(label);
      this.labels.push(label);

      if (interactive) {
        const id = `star-rating-${inputName}-${i + 1}`
        label.setAttribute('for', id);

        const radioButton = document.createElement('input');
        radioButton.type = 'radio';
        radioButton.name = inputName;
        radioButton.value = i + 1;
        radioButton.className = 'star-rating-radio';
        radioButton.id = id;

        if (i === this.ratingValue) {
          radioButton.checked = true;
        }

        element.appendChild(radioButton);
        this.radioButtons.push(radioButton);
      }
    }

    if (interactive) {
      element.addEventListener('mouseover', this.highlightThroughHoveredIndex.bind(this));
      element.addEventListener('mouseout', this.highlightThroughSelectedIndex.bind(this));
      this.highlightThroughSelectedIndex();
    } else {
      this.highlightThroughIndex(this.ratingValue);
    }
  }


  highlightThroughHoveredIndex(event) {
    const labelIndex = this.labels.indexOf(event.target);
    if (labelIndex >= 0) {
      this.highlightThroughIndex(labelIndex);
    }
  }

  highlightThroughSelectedIndex() {
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
