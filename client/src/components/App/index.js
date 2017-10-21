import React, { Component } from 'react';
import './style.css';

import Sidebar from '../Sidebar';
import Dashboard from '../Dashboard';

import * as dataUtil from '../../utils/data';
import * as config from '../../utils/config';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = config.initialState.App;
  }

  componentDidMount() {
    dataUtil
      .fetchAllDataForApp(config.routes)
      .then(dataUtil.createInitialEntityState)
      .then(data => {
        this.setState({
          ...data,
          treeData: dataUtil.createTreeView({ ...data }, config.entities)
        });
      })
      .catch(console.error);
  }

  addConversation = () => {
    if (this.state.itemEditing === null) {
      dataUtil
        .post(config.routes.conversation.create, {
          ...config.initialState[config.entities.conversation]
        })
        .then(res => res.json())
        .then(dataUtil.throwIfEmptyArray)
        .then(res => {
          this.setState(
            {
              itemEditing: res[res.length - 1],
              [config.entities.conversation]: res
            },
            () => {
              this.setState({
                entitiesCanCopyTo: dataUtil.getEntitiesCanCopyTo(
                  this.state.itemEditing,
                  this.state
                )
              });
            }
          );
        })
        .catch(console.error);
    }
  };

  handleUpdatingItem = e => {
    const target = e.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;

    this.setState({
      itemEditing: {
        ...this.state.itemEditing,
        [target.name]: value
      }
    });
  };

  handleUpdateMessageOptions = (field, content) => {
    this.setState({
      itemEditing: {
        ...this.state.itemEditing,
        [field]: content
      }
    });
  };

  handleNewChildEntity = entity => {
    dataUtil
      .post(config.routes[entity.type].create, entity)
      .then(res => res.json())
      .then(dataUtil.throwIfEmptyArray)
      .then(res => {
        this.setState(
          {
            [entity.type]: res,
            childEntities: this.state.childEntities.concat(res[res.length - 1])
          },
          () => {
            this.setState({
              treeData: dataUtil.createTreeView(
                { ...this.state },
                config.entities
              ),
              entitiesCanCopyTo: dataUtil.getEntitiesCanCopyTo(
                this.state.itemEditing,
                this.state
              )
            });
          }
        );
      })
      .catch(console.error);
  };

  handleUpdateChildEntityName = (index, name) => {
    const newArray = Array.from(this.state.childEntities);
    newArray[index].name = name;

    this.setState({
      childEntities: newArray
    });
  };

  updateTreeStructure = () => {
    this.setState({
      treeData: dataUtil.createTreeView({ ...this.state }, config.entities),
      childEntities: dataUtil.getChildEntitiesFor(
        this.state.itemEditing,
        this.state
      ),
      entitiesCanCopyTo: dataUtil.getEntitiesCanCopyTo(
        this.state.itemEditing,
        this.state
      )
    });
  };

  handleSaveItem = ({ item, reset, switchTo }) => {
    const route = item.id ? config.operations.update : config.operations.create;

    dataUtil
      .post(
        config.routes[item.type][route],
        dataUtil.makeCopyAndRemoveKeys(item, [
          'active',
          'children',
          'expand',
          'toggled'
        ])
      )
      .then(res => res.json())
      .then(dataUtil.throwIfEmptyArray)
      .then(res => {
        this.setState(
          {
            itemEditing: reset
              ? null
              : switchTo ? res[res.length - 1] : this.state.itemEditing,
            [item.type]: res
          },
          this.updateTreeStructure
        );
      })
      .catch(console.error);
  };

  handleDeleteItem = item => {
    const route = config.operations.delete;
    dataUtil
      .post(config.routes[item.type][route], item)
      .then(res => res.json())
      .then(dataUtil.throwIfEmptyArray)
      .then(res => {
        this.setState(
          {
            itemEditing: null,
            childEntities: [],
            entitiesCanCopyTo: [],
            [item.type]: res
          },
          () => {
            this.setState({
              treeData: dataUtil.createTreeView(
                { ...this.state },
                config.entities
              )
            });
          }
        );
      })
      .catch(console.error);
  };

  handleEditingChildEntity = entity => {
    this.setState(
      {
        // cursor: entity,
        itemEditing: entity
      },
      () => {
        this.setState({
          childEntities: dataUtil.getChildEntitiesFor(
            this.state.itemEditing,
            this.state
          ),
          entitiesCanCopyTo: dataUtil.getEntitiesCanCopyTo(
            this.state.itemEditing,
            this.state
          ),
          treeData: dataUtil.createTreeView(
            { ...this.state },
            config.entities
          )
        });
      }
    );
  };

  handleDashboardClose = () => {
    this.setState(
      {
        itemEditing: null,
        childEntities: []
      },
      () => {
        this.setState({
          entitiesCanCopyTo: [],
          treeData: dataUtil.createTreeView(
            { ...this.state },
            config.entities
          )
        });
      }
    );
  };

  handleTreeToggle = ({ node, expand }) => {
    /* eslint-disable react/no-direct-mutation-state */

    if (expand) {
      if (node.children) {
        node.toggled = !node.toggled;
      }

      this.setState({
        cursor: node
      });

      return;
    }

    if (this.state.cursor) {
      this.state.cursor.active = false;
    }
    node.active = true;

    this.setState(
      {
        cursor: node,
        itemEditing: node.type ? node : this.state.itemEditing
      },
      () => {
        this.setState({
          childEntities: dataUtil.getChildEntitiesFor(
            this.state.itemEditing,
            this.state
          ),
          entitiesCanCopyTo: dataUtil.getEntitiesCanCopyTo(
            this.state.itemEditing,
            this.state
          )
        });
      }
    );
  };

  handleCopyEntity = entity => {
    this.handleSaveItem({
      item: {
        ...this.state.itemEditing,
        parent: {
          ...entity.link
        },
        id: null
      },
      switchTo: true
    });
  };

  render() {
    return (
      <div className="App">
        <Sidebar
          addConversation={this.addConversation}
          conversation={this.state.conversation}
          treeData={this.state.treeData}
          handleTreeToggle={this.handleTreeToggle}
        />

        <Dashboard
          formConfig={config.forms}
          handleClose={this.handleDashboardClose}
          handleUpdateItem={this.handleUpdatingItem}
          handleSaveItem={this.handleSaveItem}
          handleDeleteItem={this.handleDeleteItem}
          handleNewChildEntity={this.handleNewChildEntity}
          handleUpdateChildEntityName={this.handleUpdateChildEntityName}
          handleEditingChildEntity={this.handleEditingChildEntity}
          handleUpdateMessageOptions={this.handleUpdateMessageOptions}
          itemEditing={this.state.itemEditing}
          childEntities={this.state.childEntities}
          entitiesCanCopyTo={this.state.entitiesCanCopyTo}
          handleCopyEntity={this.handleCopyEntity}
        />
      </div>
    );
  }
}

export default App;
