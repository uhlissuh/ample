module.exports =
function (formControlDiv, tags) {

  const tagInput = document.createElement('input');
  tagInput.className = 'tag-input';
  tagInput.type = 'text';

  const tagList = document.createElement('ul');
  tagList.className = 'tag-list';

  formControlDiv.appendChild(tagList);
  formControlDiv.appendChild(tagInput);

  tagInput.addEventListener('keydown', (e) => {
    if (e.keyCode == '13' && tagInput.value.length > 0) {
      event.preventDefault();
      addTag(tagInput.value);
    }

    if (e.keyCode == 8 && tagInput.value.length === 0 && tagList.lastChild) {
      tagList.lastChild.remove();
    }
  });

  for (const tag of tags) {
    addTag(tag);
  }

  function addTag(tag) {
    const tagListItem = document.createElement("li");
    const tagListItemInput = document.createElement('input')
    const tagListItemDeleteLink = document.createElement('a');
    const tagListItemContent = document.createElement('span');
    tagListItemContent.className = 'tag-list-item-content';
    tagListItemContent.innerText = tag;
    tagListItemDeleteLink.innerText = '×';
    tagListItemDeleteLink.className = 'tag-list-item-delete-link';
    tagListItemDeleteLink.href = '#';

    tagListItemDeleteLink.addEventListener('click', e => {
      e.preventDefault();
      tagListItem.remove();
      tagInput.focus();
    });

    tagListItemInput.value = tag;
    tagListItemInput.type = 'hidden';
    tagListItemInput.name = `tags[]`;
    tagListItem.className = 'tag-list-item';
    tagListItem.appendChild(tagListItemInput);
    tagListItem.appendChild(tagListItemContent);
    tagListItem.appendChild(tagListItemDeleteLink);
    tagList.appendChild(tagListItem);
    tagInput.value = "";
  }
}
