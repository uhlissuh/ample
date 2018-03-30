module.exports = function() {
  document.addEventListener('click', (event) => {
    const clickedElement = event.target;
    if (clickedElement.dataset.toggle === 'collapse-no-animate') {
      const collapseTargetSelector = clickedElement.dataset.target;
      const collapseTarget = document.querySelector(collapseTargetSelector);
      if (collapseTarget) {
        if (collapseTarget.classList.contains('show')) {
          collapseTarget.classList.remove('show');
          clickedElement.classList.remove('link-highlighted')
        } else {
          const collapseParentSelector = collapseTarget.dataset.parent;
          const collapseParent = document.querySelector(collapseParentSelector);
          const allCollapseElements = collapseParent.getElementsByClassName('collapse-no-animate');
          for (const collapseElement of allCollapseElements) {
            collapseElement.classList.remove('show');
          }
          const otherLinks = document.querySelectorAll('[data-toggle="collapse-no-animate"]')
          for (link of otherLinks) {
            link.classList.remove('link-highlighted');
          }
          collapseTarget.classList.add('show');
          clickedElement.classList.add('link-highlighted');
        }
      }
    }
  });
}
