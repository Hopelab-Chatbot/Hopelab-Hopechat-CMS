import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { equals, any } from 'ramda';
import {
  DropdownMenu,
  Dropdown,
  DropdownToggle,
  DropdownItem,
} from 'reactstrap';

class MediaDropdown extends Component {
  static propTypes = {
    media: PropTypes.arrayOf(PropTypes.shape({
      url: PropTypes.string,
      key: PropTypes.string,
    })).isRequired,
    selectedUrl: PropTypes.string,
    onSelection: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      dropdownOpen: false,
    };
    this.toggle = this.toggle.bind(this);
  }

  toggle() {
    this.setState({ dropdownOpen: !this.state.dropdownOpen });
  }

  renderMediaDropdownItems() {
    const { onSelection, selectedUrl, media } = this.props;
    return media.map(m => (
      <DropdownItem
        key={m.url}
        active={selectedUrl === m.url}
        onClick={() => { onSelection(m.url); }}
      >
        {m.key}
      </DropdownItem>
    ));
  }

  render() {
    const { media, selectedUrl } = this.props;
    let foundItem = 'choose media';
    const predicate = equals(selectedUrl);
    const res = media.find(({ url }) => any(predicate, [url, encodeURI(url)]));
    if (res) { foundItem = res.key; }
    return (
      <Dropdown
        style={{ cursor: 'pointer' }}
        isOpen={this.state.dropdownOpen}
        toggle={this.toggle}
      >
        <DropdownToggle
          tag="div"
          onClick={this.toggle}
          data-toggle="dropdown"
          aria-expanded={this.state.dropdownOpen}
        >
          {foundItem}
        </DropdownToggle>
        <DropdownMenu flip={false}>
          {this.renderMediaDropdownItems()}
        </DropdownMenu>
      </Dropdown>
    );
  }
}

export default MediaDropdown;
