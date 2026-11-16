import '@testing-library/jest-dom';
import structuredClone from '@ungap/structured-clone';

if (!global.structuredClone) global.structuredClone = structuredClone;
