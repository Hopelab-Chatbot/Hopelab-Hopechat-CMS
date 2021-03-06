import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';
import Form from '../forms/Form';
import WordList from '../WordList';
import DashboardHeader from './DashboardHeader';

import { IS_CRISIS_RESPONSE_DETECTION, IS_STOP_MESSAGE_DETECTION, INTRO_CONVERSATION_ID } from '../../utils/constants';
import './style.css';

const propTypes = {
  handleSaveItem: PropTypes.func,
  handleNewChildEntity: PropTypes.func,
  itemEditing: PropTypes.object,
  childEntities: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.string,
    name: PropTypes.string,
    id: PropTypes.string,
    created: PropTypes.int,
    parent: PropTypes.object,
  })),
};

class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.handleChildEntityAddition = this.handleChildEntityAddition.bind(this);
    this.handleItemNameChange = this.handleItemNameChange.bind(this);
    this.handleToggleLiveConversation =
      this.handleToggleLiveConversation.bind(this);
    this.handleToggleStudy =
      this.handleToggleStudy.bind(this);
    this.handleRuleChanged = this.handleRuleChanged.bind(this);
  }

  handleChildEntityAddition(selectedOption, callback, addedFromIndex) {
    const { childEntities, itemEditing } = this.props;

    const setNameRelToParent = ({ parent, newInt }) =>
      (`${parent.name.substr(0, 5).toUpperCase()}-${newInt}`);
    this.props.handleNewChildEntity({
      type: selectedOption,
      name: setNameRelToParent({ parent: itemEditing, newInt: childEntities.length + 1 }),
      parent: {
        type: itemEditing.type,
        id: itemEditing.id,
      },
    }, callback, addedFromIndex);
  }

  handleItemNameChange(name) {
    this.props.handleSaveItem({
      ...this.props.itemEditing,
      name,
    });
  }

  handleToggleLiveConversation() {
    this.props.handleSaveItem({
      ...this.props.itemEditing,
      isLive: !this.props.itemEditing.isLive,
    });
  }

  handleToggleStudy() {
    this.props.handleSaveItem({
      ...this.props.itemEditing,
      isStudy: !this.props.itemEditing.isStudy,
    });
  }

  handleRuleChanged(rule) {
    this.props.handleSaveItem({
      ...this.props.itemEditing,
      rule,
    });
  }

  render() {
    const { props } = this;
    const { setNewIndex, order, special, messages } = props;
    return (
      <div className="Dashboard mt-1 offset-3">
        {props.itemEditing !== null && (
          [
            <DashboardHeader
              itemName={props.itemEditing.name}
              itemType={props.itemEditing.type}
              itemId={props.itemEditing.id}
              isLive={props.itemEditing.isLive}
              isStudy={props.itemEditing.isStudy}
              rule={props.itemEditing.rule}
              onToggleLive={this.handleToggleLiveConversation}
              onToggleStudy={this.handleToggleStudy}
              onNewChildEntity={this.handleChildEntityAddition}
              onNameChanged={this.handleItemNameChange}
              onRuleChanged={this.handleRuleChanged}
              onDelete={props.handleDeleteItem}
              onCopy={props.handleCopyEntity}
              copyToItems={props.entitiesCanCopyTo}
              readOnly={props.readOnly}
              toggleReadOnly={props.toggleReadOnly}
              special={special}
              key="header"
            />,
            <div
              className={`Inner
                ${props.readOnly ? 'read-only' : ''}
                ${(special && special !== INTRO_CONVERSATION_ID) ? 'bg-secondary-override' : 'bg-default-override'}`}
              key="form"
            >
              <Form
                setNewIndex={args => setNewIndex(args)}
                item={props.itemEditing}
                config={props.formConfig[props.itemEditing.type]}
                handleSaveItem={props.handleSaveItem}
                handleDeleteItem={props.handleDeleteItem}
                handleChildEntityAddition={this.handleChildEntityAddition}
                childEntities={props.childEntities}
                images={props.images}
                conversations={props.conversations}
                videos={props.videos}
                updateStartEntity={props.updateStartEntity}
                order={order}
                special={special}
                messages={messages}
              />
              {R.any(R.equals(special), [IS_CRISIS_RESPONSE_DETECTION, IS_STOP_MESSAGE_DETECTION])
                && <WordList special={special} key="wordlist" />}
            </div>,
          ]
        )}
      </div>
    );
  }
}

Dashboard.propTypes = propTypes;
Dashboard.defaultProps = {
  handleNewChildEntity: () => null,
};

export default Dashboard;
