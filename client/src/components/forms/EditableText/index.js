import React, { Component } from 'react';
import PropTypes from 'prop-types';
import onClickOutside from 'react-onclickoutside';
import './style.css';

export class EditableText extends Component {
  static propTypes = {
    text: PropTypes.string.isRequired,
    onEditWillFinish: PropTypes.func,
    isTextArea: PropTypes.bool,
    placeholder: PropTypes.string,
    disabled: PropTypes.bool,
    alwaysEdit: PropTypes.bool,
  }

  static defaultProps = {
    onEditWillFinish() {},
    isTextArea: false,
  }

  constructor(props) {
    super(props);
    this.state = {
      editing: this.emptyText(props.text),
      text: props.text,
    };
    this.handleClickOutside = this.handleClickOutside.bind(this);
    this.handleEnterKey = this.handleEnterKey.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.text !== this.state.text) {
      this.setState({ text: nextProps.text });
    }
  }

  emptyText(text) {
    return (!text || /^\s*$/.test(text));
  }

  handleClickOutside(e) {
    const { alwaysEdit } = this.props;
    if ((this.state.editing || alwaysEdit) &&
        e.target !== this.input) {
      if (this.state.text !== this.props.text) {
        this.props.onEditWillFinish(this.state.text);
      }
      if (!this.emptyText(this.state.text)) {
        this.setState({ editing: false });
      }
    }
  }

  handleEnterKey(e) {
    const { alwaysEdit } = this.props;
    if (e.keyCode === 13 &&
        (this.state.editing || alwaysEdit) &&
        this.input === document.activeElement) {
      this.props.onEditWillFinish(this.state.text);
      if (!this.emptyText(this.state.text)) {
        this.setState({ editing: false });
      }
    }
  }

  handleChange(e) {
    this.setState({ text: e.target.value });
  }

  render() {
    const { disabled, alwaysEdit } = this.props;
    const input = this.props.isTextArea ? (
      <textarea
        type="text"
        value={this.state.text}
        style={{ width: '100%' }}
        onKeyUp={this.handleEnterKey}
        onChange={this.handleChange}
        ref={i => { this.input = i; }}
        disabled={disabled}
      />
    ) : (
      <input
        type="text"
        value={this.state.text}
        onKeyUp={this.handleEnterKey}
        onChange={this.handleChange}
        placeholder={this.props.placeholder}
        ref={i => { this.input = i; }}
        disabled={disabled}
      />
    );

    return ((this.state.editing || alwaysEdit || this.emptyText(this.state.text)) && !disabled) ? (
      input
    ) : (
      <span
        role="button"
        tabIndex={0}
        onClick={() => {
          if (this.state.editing && this.input) {
            this.props.onEditWillFinish(this.input.value);
          }
          this.setState(prevState => ({ editing: !prevState.editing }));
        }}
      >{this.state.text}
      </span>
    );
  }
}

export default onClickOutside(EditableText);
