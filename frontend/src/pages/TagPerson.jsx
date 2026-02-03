import Utility from './Utility';

function TagPerson({ currentTheme }) {
  return <Utility currentTheme={currentTheme} defaultSection="tag" hideSelector={true} />;
}

export default TagPerson;
