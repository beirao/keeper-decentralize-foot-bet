"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeCCRequest = exports.decodeRunRequest = exports.encodeOracleRequest = exports.convertCancelParams = exports.convertFulfill2Params = exports.convertFufillParams = void 0;
/**
 * @packageDocumentation
 *
 * This file provides convenience functions to interact with existing solidity contract abstraction libraries, such as
 * @truffle/contract and ethers.js specifically for our `Oracle.sol` solidity smart contract.
 */
const ethers_1 = require("ethers");
const debug_1 = require("../debug");
const helpers_1 = require("../helpers");
const debug = debug_1.makeDebug('oracle');
/**
 * Convert the javascript format of the parameters needed to call the
 * ```solidity
 *  function fulfillOracleRequest(
 *    bytes32 _requestId,
 *    uint256 _payment,
 *    address _callbackAddress,
 *    bytes4 _callbackFunctionId,
 *    uint256 _expiration,
 *    bytes32 _data
 *  )
 * ```
 * method on an Oracle.sol contract.
 *
 * @param runRequest The run request to flatten into the correct order to perform the `fulfillOracleRequest` function
 * @param response The response to fulfill the run request with, if it is an ascii string, it is converted to bytes32 string
 * @param txOpts Additional ethereum tx options
 */
function convertFufillParams(runRequest, response, txOpts = {}) {
    const d = debug.extend('fulfillOracleRequestParams');
    d('Response param: %s', response);
    const bytes32Len = 32 * 2 + 2;
    const convertedResponse = response.length < bytes32Len
        ? ethers_1.ethers.utils.formatBytes32String(response)
        : response;
    d('Converted Response param: %s', convertedResponse);
    return [
        runRequest.requestId,
        runRequest.payment,
        runRequest.callbackAddr,
        runRequest.callbackFunc,
        runRequest.expiration,
        convertedResponse,
        txOpts,
    ];
}
exports.convertFufillParams = convertFufillParams;
/**
 * Convert the javascript format of the parameters needed to call the
 * ```solidity
 *  function fulfillOracleRequest2(
 *    bytes32 _requestId,
 *    uint256 _payment,
 *    address _callbackAddress,
 *    bytes4 _callbackFunctionId,
 *    uint256 _expiration,
 *    bytes memory _data
 *  )
 * ```
 * method on an Oracle.sol contract.
 *
 * @param runRequest The run request to flatten into the correct order to perform the `fulfillOracleRequest` function
 * @param response The response to fulfill the run request with, if it is an ascii string, it is converted to bytes32 string
 * @param txOpts Additional ethereum tx options
 */
function convertFulfill2Params(runRequest, responseTypes, responseValues, txOpts = {}) {
    const d = debug.extend('fulfillOracleRequestParams');
    d('Response param: %s', responseValues);
    const types = [...responseTypes];
    const values = [...responseValues];
    types.unshift('bytes32');
    values.unshift(runRequest.requestId);
    const convertedResponse = ethers_1.ethers.utils.defaultAbiCoder.encode(types, values);
    d('Encoded Response param: %s', convertedResponse);
    return [
        runRequest.requestId,
        runRequest.payment,
        runRequest.callbackAddr,
        runRequest.callbackFunc,
        runRequest.expiration,
        convertedResponse,
        txOpts,
    ];
}
exports.convertFulfill2Params = convertFulfill2Params;
/**
 * Convert the javascript format of the parameters needed to call the
 * ```solidity
 *  function cancelOracleRequest(
 *    bytes32 _requestId,
 *    uint256 _payment,
 *    bytes4 _callbackFunc,
 *    uint256 _expiration
 *  )
 * ```
 * method on an Oracle.sol contract.
 *
 * @param runRequest The run request to flatten into the correct order to perform the `cancelOracleRequest` function
 * @param txOpts Additional ethereum tx options
 */
function convertCancelParams(runRequest, txOpts = {}) {
    return [
        runRequest.requestId,
        runRequest.payment,
        runRequest.callbackFunc,
        runRequest.expiration,
        txOpts,
    ];
}
exports.convertCancelParams = convertCancelParams;
/**
 * Abi encode parameters to call the `oracleRequest` method on the [Oracle.sol](../../../evm/contracts/Oracle.sol) contract.
 * ```solidity
 *  function oracleRequest(
 *    address _sender,
 *    uint256 _payment,
 *    bytes32 _specId,
 *    address _callbackAddress,
 *    bytes4 _callbackFunctionId,
 *    uint256 _nonce,
 *    uint256 _dataVersion,
 *    bytes _data
 *  )
 * ```
 *
 * @param specId The Job Specification ID
 * @param callbackAddr The callback contract address for the response
 * @param callbackFunctionId The callback function id for the response
 * @param nonce The nonce sent by the requester
 * @param data The CBOR payload of the request
 */
function encodeOracleRequest(specId, callbackAddr, callbackFunctionId, nonce, data, dataVersion = 1) {
    const oracleRequestSighash = '0x40429946';
    return encodeRequest(oracleRequestSighash, specId, callbackAddr, callbackFunctionId, nonce, data, dataVersion);
}
exports.encodeOracleRequest = encodeOracleRequest;
function encodeRequest(oracleRequestSighash, specId, callbackAddr, callbackFunctionId, nonce, data, dataVersion = 1) {
    const oracleRequestInputs = [
        { name: '_sender', type: 'address' },
        { name: '_payment', type: 'uint256' },
        { name: '_specId', type: 'bytes32' },
        { name: '_callbackAddress', type: 'address' },
        { name: '_callbackFunctionId', type: 'bytes4' },
        { name: '_nonce', type: 'uint256' },
        { name: '_dataVersion', type: 'uint256' },
        { name: '_data', type: 'bytes' },
    ];
    const encodedParams = ethers_1.ethers.utils.defaultAbiCoder.encode(oracleRequestInputs.map((i) => i.type), [
        ethers_1.ethers.constants.AddressZero,
        0,
        specId,
        callbackAddr,
        callbackFunctionId,
        nonce,
        dataVersion,
        data,
    ]);
    return `${oracleRequestSighash}${helpers_1.stripHexPrefix(encodedParams)}`;
}
/**
 * Extract a javascript representation of a run request from the data
 * contained within a EVM log.
 * ```solidity
 *  event OracleRequest(
 *    bytes32 indexed specId,
 *    address requester,
 *    bytes32 requestId,
 *    uint256 payment,
 *    address callbackAddr,
 *    bytes4 callbackFunctionId,
 *    uint256 cancelExpiration,
 *    uint256 dataVersion,
 *    bytes data
 *  );
 * ```
 *
 * @param log The log to extract the run request from
 */
function decodeRunRequest(log) {
    if (!log) {
        throw Error('No logs found to decode');
    }
    const ORACLE_REQUEST_TYPES = [
        'address',
        'bytes32',
        'uint256',
        'address',
        'bytes4',
        'uint256',
        'uint256',
        'bytes',
    ];
    const [requester, requestId, payment, callbackAddress, callbackFunc, expiration, version, data,] = ethers_1.ethers.utils.defaultAbiCoder.decode(ORACLE_REQUEST_TYPES, log.data);
    return {
        specId: log.topics[1],
        requester,
        requestId: helpers_1.toHex(requestId),
        payment: helpers_1.toHex(payment),
        callbackAddr: callbackAddress,
        callbackFunc: helpers_1.toHex(callbackFunc),
        expiration: helpers_1.toHex(expiration),
        data: helpers_1.addCBORMapDelimiters(Buffer.from(helpers_1.stripHexPrefix(data), 'hex')),
        dataVersion: version.toNumber(),
        topic: log.topics[0],
    };
}
exports.decodeRunRequest = decodeRunRequest;
/**
 * Extract a javascript representation of a ConcreteChainlinked#Request event
 * from an EVM log.
 * ```solidity
 *  event Request(
 *    bytes32 id,
 *    address callbackAddress,
 *    bytes4 callbackfunctionSelector,
 *    bytes data
 *  );
 * ```
 * The request event is emitted from the `ConcreteChainlinked.sol` testing contract.
 *
 * @param log The log to decode
 */
function decodeCCRequest(log) {
    const d = debug.extend('decodeRunABI');
    d('params %o', log);
    const REQUEST_TYPES = ['bytes32', 'address', 'bytes4', 'bytes'];
    const decodedValue = ethers_1.ethers.utils.defaultAbiCoder.decode(REQUEST_TYPES, log.data);
    d('decoded value %o', decodedValue);
    return decodedValue;
}
exports.decodeCCRequest = decodeCCRequest;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3JhY2xlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NvbnRyYWN0cy9vcmFjbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUE7Ozs7O0dBS0c7QUFDSCxtQ0FBK0I7QUFFL0Isb0NBQW9DO0FBQ3BDLHdDQUF3RTtBQUN4RSxNQUFNLEtBQUssR0FBRyxpQkFBUyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0FBMkZqQzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FpQkc7QUFDSCxTQUFnQixtQkFBbUIsQ0FDakMsVUFBc0IsRUFDdEIsUUFBZ0IsRUFDaEIsU0FBb0IsRUFBRTtJQUV0QixNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLDRCQUE0QixDQUFDLENBQUE7SUFDcEQsQ0FBQyxDQUFDLG9CQUFvQixFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBRWpDLE1BQU0sVUFBVSxHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzdCLE1BQU0saUJBQWlCLEdBQ3JCLFFBQVEsQ0FBQyxNQUFNLEdBQUcsVUFBVTtRQUMxQixDQUFDLENBQUMsZUFBTSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUM7UUFDNUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtJQUNkLENBQUMsQ0FBQyw4QkFBOEIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0lBRXBELE9BQU87UUFDTCxVQUFVLENBQUMsU0FBUztRQUNwQixVQUFVLENBQUMsT0FBTztRQUNsQixVQUFVLENBQUMsWUFBWTtRQUN2QixVQUFVLENBQUMsWUFBWTtRQUN2QixVQUFVLENBQUMsVUFBVTtRQUNyQixpQkFBaUI7UUFDakIsTUFBTTtLQUNQLENBQUE7QUFDSCxDQUFDO0FBeEJELGtEQXdCQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7OztHQWlCRztBQUNILFNBQWdCLHFCQUFxQixDQUNuQyxVQUFzQixFQUN0QixhQUF1QixFQUN2QixjQUF3QixFQUN4QixTQUFvQixFQUFFO0lBRXRCLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtJQUNwRCxDQUFDLENBQUMsb0JBQW9CLEVBQUUsY0FBYyxDQUFDLENBQUE7SUFDdkMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxDQUFBO0lBQ2hDLE1BQU0sTUFBTSxHQUFHLENBQUMsR0FBRyxjQUFjLENBQUMsQ0FBQTtJQUNsQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ3hCLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ3BDLE1BQU0saUJBQWlCLEdBQUcsZUFBTSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUM1RSxDQUFDLENBQUMsNEJBQTRCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtJQUNsRCxPQUFPO1FBQ0wsVUFBVSxDQUFDLFNBQVM7UUFDcEIsVUFBVSxDQUFDLE9BQU87UUFDbEIsVUFBVSxDQUFDLFlBQVk7UUFDdkIsVUFBVSxDQUFDLFlBQVk7UUFDdkIsVUFBVSxDQUFDLFVBQVU7UUFDckIsaUJBQWlCO1FBQ2pCLE1BQU07S0FDUCxDQUFBO0FBQ0gsQ0FBQztBQXZCRCxzREF1QkM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7R0FjRztBQUNILFNBQWdCLG1CQUFtQixDQUNqQyxVQUFzQixFQUN0QixTQUFvQixFQUFFO0lBRXRCLE9BQU87UUFDTCxVQUFVLENBQUMsU0FBUztRQUNwQixVQUFVLENBQUMsT0FBTztRQUNsQixVQUFVLENBQUMsWUFBWTtRQUN2QixVQUFVLENBQUMsVUFBVTtRQUNyQixNQUFNO0tBQ1AsQ0FBQTtBQUNILENBQUM7QUFYRCxrREFXQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW9CRztBQUNILFNBQWdCLG1CQUFtQixDQUNqQyxNQUFjLEVBQ2QsWUFBb0IsRUFDcEIsa0JBQTBCLEVBQzFCLEtBQWEsRUFDYixJQUFrQixFQUNsQixjQUE0QixDQUFDO0lBRTdCLE1BQU0sb0JBQW9CLEdBQUcsWUFBWSxDQUFBO0lBQ3pDLE9BQU8sYUFBYSxDQUNsQixvQkFBb0IsRUFDcEIsTUFBTSxFQUNOLFlBQVksRUFDWixrQkFBa0IsRUFDbEIsS0FBSyxFQUNMLElBQUksRUFDSixXQUFXLENBQ1osQ0FBQTtBQUNILENBQUM7QUFsQkQsa0RBa0JDO0FBRUQsU0FBUyxhQUFhLENBQ3BCLG9CQUE0QixFQUM1QixNQUFjLEVBQ2QsWUFBb0IsRUFDcEIsa0JBQTBCLEVBQzFCLEtBQWEsRUFDYixJQUFrQixFQUNsQixjQUE0QixDQUFDO0lBRTdCLE1BQU0sbUJBQW1CLEdBQUc7UUFDMUIsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUU7UUFDcEMsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUU7UUFDckMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUU7UUFDcEMsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRTtRQUM3QyxFQUFFLElBQUksRUFBRSxxQkFBcUIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO1FBQy9DLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFO1FBQ25DLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFO1FBQ3pDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFO0tBQ2pDLENBQUE7SUFDRCxNQUFNLGFBQWEsR0FBRyxlQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQ3ZELG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUN0QztRQUNFLGVBQU0sQ0FBQyxTQUFTLENBQUMsV0FBVztRQUM1QixDQUFDO1FBQ0QsTUFBTTtRQUNOLFlBQVk7UUFDWixrQkFBa0I7UUFDbEIsS0FBSztRQUNMLFdBQVc7UUFDWCxJQUFJO0tBQ0wsQ0FDRixDQUFBO0lBQ0QsT0FBTyxHQUFHLG9CQUFvQixHQUFHLHdCQUFjLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQTtBQUNsRSxDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNILFNBQWdCLGdCQUFnQixDQUFDLEdBQTBCO0lBQ3pELElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDUixNQUFNLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0tBQ3ZDO0lBRUQsTUFBTSxvQkFBb0IsR0FBRztRQUMzQixTQUFTO1FBQ1QsU0FBUztRQUNULFNBQVM7UUFDVCxTQUFTO1FBQ1QsUUFBUTtRQUNSLFNBQVM7UUFDVCxTQUFTO1FBQ1QsT0FBTztLQUNSLENBQUE7SUFDRCxNQUFNLENBQ0osU0FBUyxFQUNULFNBQVMsRUFDVCxPQUFPLEVBQ1AsZUFBZSxFQUNmLFlBQVksRUFDWixVQUFVLEVBQ1YsT0FBTyxFQUNQLElBQUksRUFDTCxHQUFHLGVBQU0sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7SUFFdkUsT0FBTztRQUNMLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNyQixTQUFTO1FBQ1QsU0FBUyxFQUFFLGVBQUssQ0FBQyxTQUFTLENBQUM7UUFDM0IsT0FBTyxFQUFFLGVBQUssQ0FBQyxPQUFPLENBQUM7UUFDdkIsWUFBWSxFQUFFLGVBQWU7UUFDN0IsWUFBWSxFQUFFLGVBQUssQ0FBQyxZQUFZLENBQUM7UUFDakMsVUFBVSxFQUFFLGVBQUssQ0FBQyxVQUFVLENBQUM7UUFDN0IsSUFBSSxFQUFFLDhCQUFvQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsd0JBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwRSxXQUFXLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRTtRQUUvQixLQUFLLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7S0FDckIsQ0FBQTtBQUNILENBQUM7QUF2Q0QsNENBdUNDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxTQUFnQixlQUFlLENBQzdCLEdBQXlCO0lBRXpCLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDdEMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUVuQixNQUFNLGFBQWEsR0FBRyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQy9ELE1BQU0sWUFBWSxHQUFHLGVBQU0sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FDdEQsYUFBYSxFQUNiLEdBQUcsQ0FBQyxJQUFJLENBQ1QsQ0FBQTtJQUNELENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUVuQyxPQUFPLFlBQVksQ0FBQTtBQUNyQixDQUFDO0FBZEQsMENBY0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBwYWNrYWdlRG9jdW1lbnRhdGlvblxuICpcbiAqIFRoaXMgZmlsZSBwcm92aWRlcyBjb252ZW5pZW5jZSBmdW5jdGlvbnMgdG8gaW50ZXJhY3Qgd2l0aCBleGlzdGluZyBzb2xpZGl0eSBjb250cmFjdCBhYnN0cmFjdGlvbiBsaWJyYXJpZXMsIHN1Y2ggYXNcbiAqIEB0cnVmZmxlL2NvbnRyYWN0IGFuZCBldGhlcnMuanMgc3BlY2lmaWNhbGx5IGZvciBvdXIgYE9yYWNsZS5zb2xgIHNvbGlkaXR5IHNtYXJ0IGNvbnRyYWN0LlxuICovXG5pbXBvcnQgeyBldGhlcnMgfSBmcm9tICdldGhlcnMnXG5pbXBvcnQgeyBCaWdOdW1iZXJpc2ggfSBmcm9tICdldGhlcnMvdXRpbHMnXG5pbXBvcnQgeyBtYWtlRGVidWcgfSBmcm9tICcuLi9kZWJ1ZydcbmltcG9ydCB7IGFkZENCT1JNYXBEZWxpbWl0ZXJzLCBzdHJpcEhleFByZWZpeCwgdG9IZXggfSBmcm9tICcuLi9oZWxwZXJzJ1xuY29uc3QgZGVidWcgPSBtYWtlRGVidWcoJ29yYWNsZScpXG5cbi8qKlxuICogVHJhbnNhY3Rpb24gb3B0aW9ucyBzdWNoIGFzIGdhc0xpbWl0LCBnYXNQcmljZSwgZGF0YSwgLi4uXG4gKi9cbnR5cGUgVHhPcHRpb25zID0gT21pdDxldGhlcnMucHJvdmlkZXJzLlRyYW5zYWN0aW9uUmVxdWVzdCwgJ3RvJyB8ICdmcm9tJz5cblxuLyoqXG4gKiBBIHJ1biByZXF1ZXN0IGlzIGFuIGV2ZW50IGVtaXR0ZWQgYnkgYE9yYWNsZS5zb2xgIHdoaWNoIHRyaWdnZXJzIGEgam9iIHJ1blxuICogb24gYSByZWNlaXZpbmcgY2hhaW5saW5rIG5vZGUgd2F0Y2hpbmcgZm9yIFJ1blJlcXVlc3RzIGNvbWluZyBmcm9tIHRoYXRcbiAqIHNwZWNJZCArIG9wdGlvbmFsbHkgcmVxdWVzdGVyLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJ1blJlcXVlc3Qge1xuICAvKipcbiAgICogVGhlIElEIG9mIHRoZSBqb2Igc3BlYyB0aGlzIHJlcXVlc3QgaXMgdGFyZ2V0aW5nXG4gICAqXG4gICAqIEBzb2xmb3JtYXQgYnl0ZXMzMlxuICAgKi9cbiAgc3BlY0lkOiBzdHJpbmdcbiAgLyoqXG4gICAqIFRoZSByZXF1ZXN0ZXIgb2YgdGhlIHJ1blxuICAgKlxuICAgKiBAc29sZm9ybWF0IGFkZHJlc3NcbiAgICovXG4gIHJlcXVlc3Rlcjogc3RyaW5nXG4gIC8qKlxuICAgKiBUaGUgSUQgb2YgdGhlIHJlcXVlc3QsIGNoZWNrIE9yYWNsZS5zb2wjb3JhY2xlUmVxdWVzdCB0byBzZWUgaG93IGl0cyBjb21wdXRlZFxuICAgKlxuICAgKiBAc29sZm9ybWF0IGJ5dGVzMzJcbiAgICovXG4gIHJlcXVlc3RJZDogc3RyaW5nXG4gIC8qKlxuICAgKiBUaGUgYW1vdW50IG9mIExJTksgdXNlZCBmb3IgcGF5bWVudFxuICAgKlxuICAgKiBAc29sZm9ybWF0IHVpbnQyNTZcbiAgICovXG4gIHBheW1lbnQ6IHN0cmluZ1xuICAvKipcbiAgICogVGhlIGFkZHJlc3Mgb2YgdGhlIGNvbnRyYWN0IGluc3RhbmNlIHRvIGNhbGxiYWNrIHdpdGggdGhlIGZ1bGZpbGxtZW50IHJlc3VsdFxuICAgKlxuICAgKiBAc29sZm9ybWF0IGFkZHJlc3NcbiAgICovXG4gIGNhbGxiYWNrQWRkcjogc3RyaW5nXG4gIC8qKlxuICAgKiBUaGUgZnVuY3Rpb24gc2VsZWN0b3Igb2YgdGhlIG1ldGhvZCB0aGF0IHRoZSBvcmFjbGUgc2hvdWxkIGNhbGwgYWZ0ZXIgZnVsZmlsbG1lbnRcbiAgICpcbiAgICogQHNvbGZvcm1hdCBieXRlczRcbiAgICovXG4gIGNhbGxiYWNrRnVuYzogc3RyaW5nXG4gIC8qKlxuICAgKiBUaGUgZXhwaXJhdGlvbiB0aGF0IHRoZSBub2RlIHNob3VsZCByZXNwb25kIGJ5IGJlZm9yZSB0aGUgcmVxdWVzdGVyIGNhbiBjYW5jZWxcbiAgICpcbiAgICogQHNvbGZvcm1hdCB1aW50MjU2XG4gICAqL1xuICBleHBpcmF0aW9uOiBzdHJpbmdcbiAgLyoqXG4gICAqIFRoZSBzcGVjaWZpZWQgZGF0YSB2ZXJzaW9uXG4gICAqXG4gICAqIEBzb2xmb3JtYXQgdWludDI1NlxuICAgKi9cbiAgZGF0YVZlcnNpb246IG51bWJlclxuICAvKipcbiAgICogVGhlIENCT1IgZW5jb2RlZCBwYXlsb2FkIG9mIHRoZSByZXF1ZXN0XG4gICAqXG4gICAqIEBzb2xmb3JtYXQgYnl0ZXNcbiAgICovXG4gIGRhdGE6IEJ1ZmZlclxuXG4gIC8qKlxuICAgKiBUaGUgaGFzaCBvZiB0aGUgc2lnbmF0dXJlIG9mIHRoZSBPcmFjbGVSZXF1ZXN0IGV2ZW50LlxuICAgKiBgYGBzb2xpZGl0eVxuICAgKiAgZXZlbnQgT3JhY2xlUmVxdWVzdChcbiAgICogICAgYnl0ZXMzMiBpbmRleGVkIHNwZWNJZCxcbiAgICogICAgYWRkcmVzcyByZXF1ZXN0ZXIsXG4gICAqICAgIGJ5dGVzMzIgcmVxdWVzdElkLFxuICAgKiAgICB1aW50MjU2IHBheW1lbnQsXG4gICAqICAgIGFkZHJlc3MgY2FsbGJhY2tBZGRyLFxuICAgKiAgICBieXRlczQgY2FsbGJhY2tGdW5jdGlvbklkLFxuICAgKiAgICB1aW50MjU2IGNhbmNlbEV4cGlyYXRpb24sXG4gICAqICAgIHVpbnQyNTYgZGF0YVZlcnNpb24sXG4gICAqICAgIGJ5dGVzIGRhdGFcbiAgICogICk7XG4gICAqIGBgYFxuICAgKiBOb3RlOiB0aGlzIGlzIGEgcHJvcGVydHkgdXNlZCBmb3IgdGVzdGluZyBwdXJwb3NlcyBvbmx5LlxuICAgKiBJdCBpcyBub3QgcGFydCBvZiB0aGUgYWN0dWFsIHJ1biByZXF1ZXN0LlxuICAgKlxuICAgKiBAc29sZm9ybWF0IGJ5dGVzMzJcbiAgICovXG4gIHRvcGljOiBzdHJpbmdcbn1cblxuLyoqXG4gKiBDb252ZXJ0IHRoZSBqYXZhc2NyaXB0IGZvcm1hdCBvZiB0aGUgcGFyYW1ldGVycyBuZWVkZWQgdG8gY2FsbCB0aGVcbiAqIGBgYHNvbGlkaXR5XG4gKiAgZnVuY3Rpb24gZnVsZmlsbE9yYWNsZVJlcXVlc3QoXG4gKiAgICBieXRlczMyIF9yZXF1ZXN0SWQsXG4gKiAgICB1aW50MjU2IF9wYXltZW50LFxuICogICAgYWRkcmVzcyBfY2FsbGJhY2tBZGRyZXNzLFxuICogICAgYnl0ZXM0IF9jYWxsYmFja0Z1bmN0aW9uSWQsXG4gKiAgICB1aW50MjU2IF9leHBpcmF0aW9uLFxuICogICAgYnl0ZXMzMiBfZGF0YVxuICogIClcbiAqIGBgYFxuICogbWV0aG9kIG9uIGFuIE9yYWNsZS5zb2wgY29udHJhY3QuXG4gKlxuICogQHBhcmFtIHJ1blJlcXVlc3QgVGhlIHJ1biByZXF1ZXN0IHRvIGZsYXR0ZW4gaW50byB0aGUgY29ycmVjdCBvcmRlciB0byBwZXJmb3JtIHRoZSBgZnVsZmlsbE9yYWNsZVJlcXVlc3RgIGZ1bmN0aW9uXG4gKiBAcGFyYW0gcmVzcG9uc2UgVGhlIHJlc3BvbnNlIHRvIGZ1bGZpbGwgdGhlIHJ1biByZXF1ZXN0IHdpdGgsIGlmIGl0IGlzIGFuIGFzY2lpIHN0cmluZywgaXQgaXMgY29udmVydGVkIHRvIGJ5dGVzMzIgc3RyaW5nXG4gKiBAcGFyYW0gdHhPcHRzIEFkZGl0aW9uYWwgZXRoZXJldW0gdHggb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydEZ1ZmlsbFBhcmFtcyhcbiAgcnVuUmVxdWVzdDogUnVuUmVxdWVzdCxcbiAgcmVzcG9uc2U6IHN0cmluZyxcbiAgdHhPcHRzOiBUeE9wdGlvbnMgPSB7fSxcbik6IFtzdHJpbmcsIHN0cmluZywgc3RyaW5nLCBzdHJpbmcsIHN0cmluZywgc3RyaW5nLCBUeE9wdGlvbnNdIHtcbiAgY29uc3QgZCA9IGRlYnVnLmV4dGVuZCgnZnVsZmlsbE9yYWNsZVJlcXVlc3RQYXJhbXMnKVxuICBkKCdSZXNwb25zZSBwYXJhbTogJXMnLCByZXNwb25zZSlcblxuICBjb25zdCBieXRlczMyTGVuID0gMzIgKiAyICsgMlxuICBjb25zdCBjb252ZXJ0ZWRSZXNwb25zZSA9XG4gICAgcmVzcG9uc2UubGVuZ3RoIDwgYnl0ZXMzMkxlblxuICAgICAgPyBldGhlcnMudXRpbHMuZm9ybWF0Qnl0ZXMzMlN0cmluZyhyZXNwb25zZSlcbiAgICAgIDogcmVzcG9uc2VcbiAgZCgnQ29udmVydGVkIFJlc3BvbnNlIHBhcmFtOiAlcycsIGNvbnZlcnRlZFJlc3BvbnNlKVxuXG4gIHJldHVybiBbXG4gICAgcnVuUmVxdWVzdC5yZXF1ZXN0SWQsXG4gICAgcnVuUmVxdWVzdC5wYXltZW50LFxuICAgIHJ1blJlcXVlc3QuY2FsbGJhY2tBZGRyLFxuICAgIHJ1blJlcXVlc3QuY2FsbGJhY2tGdW5jLFxuICAgIHJ1blJlcXVlc3QuZXhwaXJhdGlvbixcbiAgICBjb252ZXJ0ZWRSZXNwb25zZSxcbiAgICB0eE9wdHMsXG4gIF1cbn1cblxuLyoqXG4gKiBDb252ZXJ0IHRoZSBqYXZhc2NyaXB0IGZvcm1hdCBvZiB0aGUgcGFyYW1ldGVycyBuZWVkZWQgdG8gY2FsbCB0aGVcbiAqIGBgYHNvbGlkaXR5XG4gKiAgZnVuY3Rpb24gZnVsZmlsbE9yYWNsZVJlcXVlc3QyKFxuICogICAgYnl0ZXMzMiBfcmVxdWVzdElkLFxuICogICAgdWludDI1NiBfcGF5bWVudCxcbiAqICAgIGFkZHJlc3MgX2NhbGxiYWNrQWRkcmVzcyxcbiAqICAgIGJ5dGVzNCBfY2FsbGJhY2tGdW5jdGlvbklkLFxuICogICAgdWludDI1NiBfZXhwaXJhdGlvbixcbiAqICAgIGJ5dGVzIG1lbW9yeSBfZGF0YVxuICogIClcbiAqIGBgYFxuICogbWV0aG9kIG9uIGFuIE9yYWNsZS5zb2wgY29udHJhY3QuXG4gKlxuICogQHBhcmFtIHJ1blJlcXVlc3QgVGhlIHJ1biByZXF1ZXN0IHRvIGZsYXR0ZW4gaW50byB0aGUgY29ycmVjdCBvcmRlciB0byBwZXJmb3JtIHRoZSBgZnVsZmlsbE9yYWNsZVJlcXVlc3RgIGZ1bmN0aW9uXG4gKiBAcGFyYW0gcmVzcG9uc2UgVGhlIHJlc3BvbnNlIHRvIGZ1bGZpbGwgdGhlIHJ1biByZXF1ZXN0IHdpdGgsIGlmIGl0IGlzIGFuIGFzY2lpIHN0cmluZywgaXQgaXMgY29udmVydGVkIHRvIGJ5dGVzMzIgc3RyaW5nXG4gKiBAcGFyYW0gdHhPcHRzIEFkZGl0aW9uYWwgZXRoZXJldW0gdHggb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydEZ1bGZpbGwyUGFyYW1zKFxuICBydW5SZXF1ZXN0OiBSdW5SZXF1ZXN0LFxuICByZXNwb25zZVR5cGVzOiBzdHJpbmdbXSxcbiAgcmVzcG9uc2VWYWx1ZXM6IHN0cmluZ1tdLFxuICB0eE9wdHM6IFR4T3B0aW9ucyA9IHt9LFxuKTogW3N0cmluZywgc3RyaW5nLCBzdHJpbmcsIHN0cmluZywgc3RyaW5nLCBzdHJpbmcsIFR4T3B0aW9uc10ge1xuICBjb25zdCBkID0gZGVidWcuZXh0ZW5kKCdmdWxmaWxsT3JhY2xlUmVxdWVzdFBhcmFtcycpXG4gIGQoJ1Jlc3BvbnNlIHBhcmFtOiAlcycsIHJlc3BvbnNlVmFsdWVzKVxuICBjb25zdCB0eXBlcyA9IFsuLi5yZXNwb25zZVR5cGVzXVxuICBjb25zdCB2YWx1ZXMgPSBbLi4ucmVzcG9uc2VWYWx1ZXNdXG4gIHR5cGVzLnVuc2hpZnQoJ2J5dGVzMzInKVxuICB2YWx1ZXMudW5zaGlmdChydW5SZXF1ZXN0LnJlcXVlc3RJZClcbiAgY29uc3QgY29udmVydGVkUmVzcG9uc2UgPSBldGhlcnMudXRpbHMuZGVmYXVsdEFiaUNvZGVyLmVuY29kZSh0eXBlcywgdmFsdWVzKVxuICBkKCdFbmNvZGVkIFJlc3BvbnNlIHBhcmFtOiAlcycsIGNvbnZlcnRlZFJlc3BvbnNlKVxuICByZXR1cm4gW1xuICAgIHJ1blJlcXVlc3QucmVxdWVzdElkLFxuICAgIHJ1blJlcXVlc3QucGF5bWVudCxcbiAgICBydW5SZXF1ZXN0LmNhbGxiYWNrQWRkcixcbiAgICBydW5SZXF1ZXN0LmNhbGxiYWNrRnVuYyxcbiAgICBydW5SZXF1ZXN0LmV4cGlyYXRpb24sXG4gICAgY29udmVydGVkUmVzcG9uc2UsXG4gICAgdHhPcHRzLFxuICBdXG59XG5cbi8qKlxuICogQ29udmVydCB0aGUgamF2YXNjcmlwdCBmb3JtYXQgb2YgdGhlIHBhcmFtZXRlcnMgbmVlZGVkIHRvIGNhbGwgdGhlXG4gKiBgYGBzb2xpZGl0eVxuICogIGZ1bmN0aW9uIGNhbmNlbE9yYWNsZVJlcXVlc3QoXG4gKiAgICBieXRlczMyIF9yZXF1ZXN0SWQsXG4gKiAgICB1aW50MjU2IF9wYXltZW50LFxuICogICAgYnl0ZXM0IF9jYWxsYmFja0Z1bmMsXG4gKiAgICB1aW50MjU2IF9leHBpcmF0aW9uXG4gKiAgKVxuICogYGBgXG4gKiBtZXRob2Qgb24gYW4gT3JhY2xlLnNvbCBjb250cmFjdC5cbiAqXG4gKiBAcGFyYW0gcnVuUmVxdWVzdCBUaGUgcnVuIHJlcXVlc3QgdG8gZmxhdHRlbiBpbnRvIHRoZSBjb3JyZWN0IG9yZGVyIHRvIHBlcmZvcm0gdGhlIGBjYW5jZWxPcmFjbGVSZXF1ZXN0YCBmdW5jdGlvblxuICogQHBhcmFtIHR4T3B0cyBBZGRpdGlvbmFsIGV0aGVyZXVtIHR4IG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRDYW5jZWxQYXJhbXMoXG4gIHJ1blJlcXVlc3Q6IFJ1blJlcXVlc3QsXG4gIHR4T3B0czogVHhPcHRpb25zID0ge30sXG4pOiBbc3RyaW5nLCBzdHJpbmcsIHN0cmluZywgc3RyaW5nLCBUeE9wdGlvbnNdIHtcbiAgcmV0dXJuIFtcbiAgICBydW5SZXF1ZXN0LnJlcXVlc3RJZCxcbiAgICBydW5SZXF1ZXN0LnBheW1lbnQsXG4gICAgcnVuUmVxdWVzdC5jYWxsYmFja0Z1bmMsXG4gICAgcnVuUmVxdWVzdC5leHBpcmF0aW9uLFxuICAgIHR4T3B0cyxcbiAgXVxufVxuXG4vKipcbiAqIEFiaSBlbmNvZGUgcGFyYW1ldGVycyB0byBjYWxsIHRoZSBgb3JhY2xlUmVxdWVzdGAgbWV0aG9kIG9uIHRoZSBbT3JhY2xlLnNvbF0oLi4vLi4vLi4vZXZtL2NvbnRyYWN0cy9PcmFjbGUuc29sKSBjb250cmFjdC5cbiAqIGBgYHNvbGlkaXR5XG4gKiAgZnVuY3Rpb24gb3JhY2xlUmVxdWVzdChcbiAqICAgIGFkZHJlc3MgX3NlbmRlcixcbiAqICAgIHVpbnQyNTYgX3BheW1lbnQsXG4gKiAgICBieXRlczMyIF9zcGVjSWQsXG4gKiAgICBhZGRyZXNzIF9jYWxsYmFja0FkZHJlc3MsXG4gKiAgICBieXRlczQgX2NhbGxiYWNrRnVuY3Rpb25JZCxcbiAqICAgIHVpbnQyNTYgX25vbmNlLFxuICogICAgdWludDI1NiBfZGF0YVZlcnNpb24sXG4gKiAgICBieXRlcyBfZGF0YVxuICogIClcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcGVjSWQgVGhlIEpvYiBTcGVjaWZpY2F0aW9uIElEXG4gKiBAcGFyYW0gY2FsbGJhY2tBZGRyIFRoZSBjYWxsYmFjayBjb250cmFjdCBhZGRyZXNzIGZvciB0aGUgcmVzcG9uc2VcbiAqIEBwYXJhbSBjYWxsYmFja0Z1bmN0aW9uSWQgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIGlkIGZvciB0aGUgcmVzcG9uc2VcbiAqIEBwYXJhbSBub25jZSBUaGUgbm9uY2Ugc2VudCBieSB0aGUgcmVxdWVzdGVyXG4gKiBAcGFyYW0gZGF0YSBUaGUgQ0JPUiBwYXlsb2FkIG9mIHRoZSByZXF1ZXN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbmNvZGVPcmFjbGVSZXF1ZXN0KFxuICBzcGVjSWQ6IHN0cmluZyxcbiAgY2FsbGJhY2tBZGRyOiBzdHJpbmcsXG4gIGNhbGxiYWNrRnVuY3Rpb25JZDogc3RyaW5nLFxuICBub25jZTogbnVtYmVyLFxuICBkYXRhOiBCaWdOdW1iZXJpc2gsXG4gIGRhdGFWZXJzaW9uOiBCaWdOdW1iZXJpc2ggPSAxLFxuKTogc3RyaW5nIHtcbiAgY29uc3Qgb3JhY2xlUmVxdWVzdFNpZ2hhc2ggPSAnMHg0MDQyOTk0NidcbiAgcmV0dXJuIGVuY29kZVJlcXVlc3QoXG4gICAgb3JhY2xlUmVxdWVzdFNpZ2hhc2gsXG4gICAgc3BlY0lkLFxuICAgIGNhbGxiYWNrQWRkcixcbiAgICBjYWxsYmFja0Z1bmN0aW9uSWQsXG4gICAgbm9uY2UsXG4gICAgZGF0YSxcbiAgICBkYXRhVmVyc2lvbixcbiAgKVxufVxuXG5mdW5jdGlvbiBlbmNvZGVSZXF1ZXN0KFxuICBvcmFjbGVSZXF1ZXN0U2lnaGFzaDogc3RyaW5nLFxuICBzcGVjSWQ6IHN0cmluZyxcbiAgY2FsbGJhY2tBZGRyOiBzdHJpbmcsXG4gIGNhbGxiYWNrRnVuY3Rpb25JZDogc3RyaW5nLFxuICBub25jZTogbnVtYmVyLFxuICBkYXRhOiBCaWdOdW1iZXJpc2gsXG4gIGRhdGFWZXJzaW9uOiBCaWdOdW1iZXJpc2ggPSAxLFxuKTogc3RyaW5nIHtcbiAgY29uc3Qgb3JhY2xlUmVxdWVzdElucHV0cyA9IFtcbiAgICB7IG5hbWU6ICdfc2VuZGVyJywgdHlwZTogJ2FkZHJlc3MnIH0sXG4gICAgeyBuYW1lOiAnX3BheW1lbnQnLCB0eXBlOiAndWludDI1NicgfSxcbiAgICB7IG5hbWU6ICdfc3BlY0lkJywgdHlwZTogJ2J5dGVzMzInIH0sXG4gICAgeyBuYW1lOiAnX2NhbGxiYWNrQWRkcmVzcycsIHR5cGU6ICdhZGRyZXNzJyB9LFxuICAgIHsgbmFtZTogJ19jYWxsYmFja0Z1bmN0aW9uSWQnLCB0eXBlOiAnYnl0ZXM0JyB9LFxuICAgIHsgbmFtZTogJ19ub25jZScsIHR5cGU6ICd1aW50MjU2JyB9LFxuICAgIHsgbmFtZTogJ19kYXRhVmVyc2lvbicsIHR5cGU6ICd1aW50MjU2JyB9LFxuICAgIHsgbmFtZTogJ19kYXRhJywgdHlwZTogJ2J5dGVzJyB9LFxuICBdXG4gIGNvbnN0IGVuY29kZWRQYXJhbXMgPSBldGhlcnMudXRpbHMuZGVmYXVsdEFiaUNvZGVyLmVuY29kZShcbiAgICBvcmFjbGVSZXF1ZXN0SW5wdXRzLm1hcCgoaSkgPT4gaS50eXBlKSxcbiAgICBbXG4gICAgICBldGhlcnMuY29uc3RhbnRzLkFkZHJlc3NaZXJvLFxuICAgICAgMCxcbiAgICAgIHNwZWNJZCxcbiAgICAgIGNhbGxiYWNrQWRkcixcbiAgICAgIGNhbGxiYWNrRnVuY3Rpb25JZCxcbiAgICAgIG5vbmNlLFxuICAgICAgZGF0YVZlcnNpb24sXG4gICAgICBkYXRhLFxuICAgIF0sXG4gIClcbiAgcmV0dXJuIGAke29yYWNsZVJlcXVlc3RTaWdoYXNofSR7c3RyaXBIZXhQcmVmaXgoZW5jb2RlZFBhcmFtcyl9YFxufVxuXG4vKipcbiAqIEV4dHJhY3QgYSBqYXZhc2NyaXB0IHJlcHJlc2VudGF0aW9uIG9mIGEgcnVuIHJlcXVlc3QgZnJvbSB0aGUgZGF0YVxuICogY29udGFpbmVkIHdpdGhpbiBhIEVWTSBsb2cuXG4gKiBgYGBzb2xpZGl0eVxuICogIGV2ZW50IE9yYWNsZVJlcXVlc3QoXG4gKiAgICBieXRlczMyIGluZGV4ZWQgc3BlY0lkLFxuICogICAgYWRkcmVzcyByZXF1ZXN0ZXIsXG4gKiAgICBieXRlczMyIHJlcXVlc3RJZCxcbiAqICAgIHVpbnQyNTYgcGF5bWVudCxcbiAqICAgIGFkZHJlc3MgY2FsbGJhY2tBZGRyLFxuICogICAgYnl0ZXM0IGNhbGxiYWNrRnVuY3Rpb25JZCxcbiAqICAgIHVpbnQyNTYgY2FuY2VsRXhwaXJhdGlvbixcbiAqICAgIHVpbnQyNTYgZGF0YVZlcnNpb24sXG4gKiAgICBieXRlcyBkYXRhXG4gKiAgKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBsb2cgVGhlIGxvZyB0byBleHRyYWN0IHRoZSBydW4gcmVxdWVzdCBmcm9tXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWNvZGVSdW5SZXF1ZXN0KGxvZz86IGV0aGVycy5wcm92aWRlcnMuTG9nKTogUnVuUmVxdWVzdCB7XG4gIGlmICghbG9nKSB7XG4gICAgdGhyb3cgRXJyb3IoJ05vIGxvZ3MgZm91bmQgdG8gZGVjb2RlJylcbiAgfVxuXG4gIGNvbnN0IE9SQUNMRV9SRVFVRVNUX1RZUEVTID0gW1xuICAgICdhZGRyZXNzJyxcbiAgICAnYnl0ZXMzMicsXG4gICAgJ3VpbnQyNTYnLFxuICAgICdhZGRyZXNzJyxcbiAgICAnYnl0ZXM0JyxcbiAgICAndWludDI1NicsXG4gICAgJ3VpbnQyNTYnLFxuICAgICdieXRlcycsXG4gIF1cbiAgY29uc3QgW1xuICAgIHJlcXVlc3RlcixcbiAgICByZXF1ZXN0SWQsXG4gICAgcGF5bWVudCxcbiAgICBjYWxsYmFja0FkZHJlc3MsXG4gICAgY2FsbGJhY2tGdW5jLFxuICAgIGV4cGlyYXRpb24sXG4gICAgdmVyc2lvbixcbiAgICBkYXRhLFxuICBdID0gZXRoZXJzLnV0aWxzLmRlZmF1bHRBYmlDb2Rlci5kZWNvZGUoT1JBQ0xFX1JFUVVFU1RfVFlQRVMsIGxvZy5kYXRhKVxuXG4gIHJldHVybiB7XG4gICAgc3BlY0lkOiBsb2cudG9waWNzWzFdLFxuICAgIHJlcXVlc3RlcixcbiAgICByZXF1ZXN0SWQ6IHRvSGV4KHJlcXVlc3RJZCksXG4gICAgcGF5bWVudDogdG9IZXgocGF5bWVudCksXG4gICAgY2FsbGJhY2tBZGRyOiBjYWxsYmFja0FkZHJlc3MsXG4gICAgY2FsbGJhY2tGdW5jOiB0b0hleChjYWxsYmFja0Z1bmMpLFxuICAgIGV4cGlyYXRpb246IHRvSGV4KGV4cGlyYXRpb24pLFxuICAgIGRhdGE6IGFkZENCT1JNYXBEZWxpbWl0ZXJzKEJ1ZmZlci5mcm9tKHN0cmlwSGV4UHJlZml4KGRhdGEpLCAnaGV4JykpLFxuICAgIGRhdGFWZXJzaW9uOiB2ZXJzaW9uLnRvTnVtYmVyKCksXG5cbiAgICB0b3BpYzogbG9nLnRvcGljc1swXSxcbiAgfVxufVxuXG4vKipcbiAqIEV4dHJhY3QgYSBqYXZhc2NyaXB0IHJlcHJlc2VudGF0aW9uIG9mIGEgQ29uY3JldGVDaGFpbmxpbmtlZCNSZXF1ZXN0IGV2ZW50XG4gKiBmcm9tIGFuIEVWTSBsb2cuXG4gKiBgYGBzb2xpZGl0eVxuICogIGV2ZW50IFJlcXVlc3QoXG4gKiAgICBieXRlczMyIGlkLFxuICogICAgYWRkcmVzcyBjYWxsYmFja0FkZHJlc3MsXG4gKiAgICBieXRlczQgY2FsbGJhY2tmdW5jdGlvblNlbGVjdG9yLFxuICogICAgYnl0ZXMgZGF0YVxuICogICk7XG4gKiBgYGBcbiAqIFRoZSByZXF1ZXN0IGV2ZW50IGlzIGVtaXR0ZWQgZnJvbSB0aGUgYENvbmNyZXRlQ2hhaW5saW5rZWQuc29sYCB0ZXN0aW5nIGNvbnRyYWN0LlxuICpcbiAqIEBwYXJhbSBsb2cgVGhlIGxvZyB0byBkZWNvZGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlY29kZUNDUmVxdWVzdChcbiAgbG9nOiBldGhlcnMucHJvdmlkZXJzLkxvZyxcbik6IFtzdHJpbmcsIHN0cmluZywgc3RyaW5nLCBzdHJpbmddIHtcbiAgY29uc3QgZCA9IGRlYnVnLmV4dGVuZCgnZGVjb2RlUnVuQUJJJylcbiAgZCgncGFyYW1zICVvJywgbG9nKVxuXG4gIGNvbnN0IFJFUVVFU1RfVFlQRVMgPSBbJ2J5dGVzMzInLCAnYWRkcmVzcycsICdieXRlczQnLCAnYnl0ZXMnXVxuICBjb25zdCBkZWNvZGVkVmFsdWUgPSBldGhlcnMudXRpbHMuZGVmYXVsdEFiaUNvZGVyLmRlY29kZShcbiAgICBSRVFVRVNUX1RZUEVTLFxuICAgIGxvZy5kYXRhLFxuICApXG4gIGQoJ2RlY29kZWQgdmFsdWUgJW8nLCBkZWNvZGVkVmFsdWUpXG5cbiAgcmV0dXJuIGRlY29kZWRWYWx1ZVxufVxuIl19