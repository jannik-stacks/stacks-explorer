import '@testing-library/jest-dom';
import structuredClone from '@ungap/structured-clone';

global.structuredClone ??= value => structuredClone(value, { lossy: true });
