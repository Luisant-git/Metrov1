import React from 'react';
import { View, Text, ScrollView } from 'react-native';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#b71c1c', padding: 20, paddingTop: 60 }}>
          <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>App Crashed</Text>
          <ScrollView>
            <Text style={{ color: 'white', fontFamily: 'monospace' }}>
              {this.state.error?.toString()}
            </Text>
            <Text style={{ color: '#ffcdd2', fontFamily: 'monospace', marginTop: 20 }}>
              {this.state.error?.stack}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}
