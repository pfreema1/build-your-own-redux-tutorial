///////////////////////////////
// Mini Redux implementation //
///////////////////////////////

import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import PropTypes from "prop-types";

////////////////////////////
//    Validate action     //
////////////////////////////
const validateAction = action => {
  if (!action || typeof action !== "object" || Array.isArray(action)) {
    throw new Error("Action must be an object!");
  }
  if (typeof action.type === "undefined") {
    throw new Error("Action must have a type!");
  }
};

const createStore = reducer => {
  let state = undefined;
  const subscribers = [];
  const store = {
    dispatch: action => {
      validateAction(action);
      state = reducer(state, action);
      //calls the render function!
      subscribers.forEach(handler => handler());
    },
    getState: () => state,
    subscribe: handler => {
      subscribers.push(handler);
      //returns a function that unsubscribes
      return () => {
        const index = subscribers.indexOf(handler);
        if (index > 0) {
          subscribers.splice(index, 1);
        }
      };
    }
  };
  store.dispatch({ type: "@@redux/INIT" });
  return store;
};

////////////////////////////////////////////////
//            Provider                        //
////////////////////////////////////////////////
class Provider extends React.Component {
  getChildContext() {
    return {
      store: this.props.store
    };
  }
  render() {
    return this.props.children;
  }
}

Provider.childContextTypes = {
  store: PropTypes.object
};

////////////////////////////////////////////////
//            connect
//     this function converts context back into props
////////////////////////////////////////////////
const connect = (
  mapStateToProps = () => ({}),
  mapDispatchToProps = () => ({})
) => Component => {
  class Connected extends React.Component {
    onStoreOrPropsChange(props) {
      const { store } = this.context;
      const state = store.getState();
      const stateProps = mapStateToProps(state);
      console.log("in connected - stateProps:  ", stateProps);
      console.log("in connected - props:  ", props);
      const dispatchProps = mapDispatchToProps(store.dispatch);
      this.setState({
        ...stateProps,
        ...dispatchProps
      });
    }
    componentWillMount() {
      const { store } = this.context;
      this.onStoreOrPropsChange(this.props);
      this.unsubscribe = store.subscribe(() =>
        this.onStoreOrPropsChange(this.props)
      );
    }
    componentWillReceiveProps(nextProps) {
      this.onStoreOrPropsChange(nextProps);
    }
    componentWillUnmount() {
      this.unsubscribe();
    }
    render() {
      return <Component {...this.props} {...this.state} />;
    }
  }

  Connected.contextTypes = {
    store: PropTypes.object
  };

  return Connected;
};

//////////////////////
// Our action types //
//////////////////////

const CREATE_NOTE = "CREATE_NOTE";
const UPDATE_NOTE = "UPDATE_NOTE";
const OPEN_NOTE = "OPEN_NOTE";
const CLOSE_NOTE = "CLOSE_NOTE";

/////////////////
// Our reducer //
/////////////////

const initialState = {
  nextNoteId: 1,
  notes: {},
  openNoteId: null
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case CREATE_NOTE: {
      const id = state.nextNoteId;
      const newNote = {
        id,
        content: ""
      };
      return {
        ...state,
        nextNoteId: id + 1,
        openNoteId: id,
        notes: {
          ...state.notes,
          [id]: newNote
        }
      };
    }
    case UPDATE_NOTE: {
      // console.log("UPDATE_NOTE reducer running");
      const { id, content } = action;
      const editedNote = {
        ...state.notes[id],
        content
      };
      return {
        ...state,
        notes: {
          ...state.notes,
          [id]: editedNote
        }
      };
    }
    case OPEN_NOTE: {
      return {
        ...state,
        openNoteId: action.id
      };
    }
    case CLOSE_NOTE: {
      return {
        ...state,
        openNoteId: null
      };
    }
    default:
      return state;
  }
};

/////////////////////
//   Our Store     //
/////////////////////
const store = createStore(reducer);

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
//                           COMPONENTS
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

const NoteEditor = ({ note, onChangeNote, onCloseNote }) => (
  <div>
    <div>
      <textarea
        className="editor-content"
        autoFocus
        value={note.content}
        onChange={event => onChangeNote(note.id, event.target.value)}
        rows={10}
        cols={80}
      />
    </div>
    <button className="editor-button" onClick={onCloseNote}>
      Close
    </button>
  </div>
);

const NoteTitle = ({ note }) => {
  const title = note.content.split("\n")[0].replace(/^\s+|\s+$/g, "");
  if (title === "") {
    return <i>Unititled</i>;
  }
  return <span>{title}</span>;
};

const NoteLink = ({ note, onOpenNote }) => (
  <li className="note-list-item">
    <a href="#" onClick={() => onOpenNote(note.id)}>
      <NoteTitle note={note} />
    </a>
  </li>
);

const NoteList = ({ notes, onOpenNote }) => (
  <ul className="note-list">
    {Object.keys(notes).map(id => (
      <NoteLink key={id} note={notes[id]} onOpenNote={onOpenNote} />
    ))}
  </ul>
);

const NoteApp = ({
  notes,
  openNoteId,
  onAddNote,
  onChangeNote,
  onOpenNote,
  onCloseNote
}) => (
  <div>
    {openNoteId ? (
      <NoteEditor
        note={notes[openNoteId]}
        onChangeNote={onChangeNote}
        onCloseNote={onCloseNote}
      />
    ) : (
      <div>
        <NoteList notes={notes} onOpenNote={onOpenNote} />
        <button className="editor-button" onClick={onAddNote}>
          New Note
        </button>
      </div>
    )}
  </div>
);

// why does this only have one parameter when
// where it's being called has two?
// "takes the current state from out store and returns some props"
const mapStateToProps = state => {
  console.log("mapStateToProps - arguments:  ", arguments);
  return {
    notes: state.notes,
    openNoteId: state.openNoteId
  };
};

//"takes the dispatch method of our store and returns some more props
//That gives us a new component, which will automatically get all those
//mapped props (plus any extra ones we pass in)"
const mapDispatchToProps = dispatch => ({
  onAddNote: () =>
    dispatch({
      type: CREATE_NOTE
    }),
  onChangeNote: (id, content) =>
    dispatch({
      type: UPDATE_NOTE,
      id,
      content
    }),
  onOpenNote: id =>
    dispatch({
      type: OPEN_NOTE,
      id
    }),
  onCloseNote: () =>
    dispatch({
      type: CLOSE_NOTE
    })
});

const NoteAppContainer = connect(mapStateToProps, mapDispatchToProps)(NoteApp);

////////////////////
// Render our app //
////////////////////

ReactDOM.render(
  <Provider store={store}>
    <NoteAppContainer />
  </Provider>,
  document.getElementById("root")
);

//////////////////////
// Prop Logger  (HOC)
//////////////////////
function logProps(WrappedComponent) {
  return class extends React.Component {
    componentWillReceiveProps(nextProps) {
      console.log("Current Props:  ", this.props);
      console.log("Next Props:  ", nextProps);
    }
    render() {
      return <WrappedComponent {...this.props} />;
    }
  };
}
