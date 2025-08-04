declare module '@deck.gl/react' {
  import { Component } from 'react';

  interface DeckGLProps {
    views?: any;
    viewState?: any;
    controller?: boolean;
    layers?: any[];
    onViewStateChange?: (params: { viewState: any }) => void;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }

  export default class DeckGL extends Component<DeckGLProps> {}
}

declare module '@deck.gl/layers' {
  export class ScatterplotLayer {
    constructor(props: any);
  }

  export class PolygonLayer {
    constructor(props: any);
  }
}

declare module '@deck.gl/core' {
  export class MapView {
    constructor(props: any);
  }
}
