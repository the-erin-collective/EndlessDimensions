package com.moud.terra;

import org.graalvm.polyglot.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigInteger;
import java.util.concurrent.CompletableFuture;

/**
 * Utility class for handling type safety and conversions between JavaScript and Java types.
 * Ensures proper mapping between JavaScript BigInt/Number and Java long/int types.
 */
public class TypeSafetyHandler {
    
    private static final Logger logger = LoggerFactory.getLogger(TypeSafetyHandler.class);
    
    // JavaScript Number.MAX_SAFE_INTEGER (2^53 - 1)
    private static final long MAX_SAFE_INTEGER = 9007199254740991L;
    private static final long MIN_SAFE_INTEGER = -9007199254740991L;
    
    /**
     * Safely converts a JavaScript value to Java long, handling BigInt and Number types.
     * 
     * @param jsValue JavaScript value (BigInt or Number)
     * @param paramName Parameter name for error reporting
     * @return Java long value
     * @throws IllegalArgumentException if conversion fails or precision loss would occur
     */
    public static long safeConvertToLong(Value jsValue, String paramName) {
        if (jsValue == null) {
            throw new IllegalArgumentException(paramName + " cannot be null");
        }
        
        try {
            if (jsValue.fitsInLong()) {
                return jsValue.asLong();
            }
            
            if (jsValue.fitsInDouble()) {
                double doubleValue = jsValue.asDouble();
                
                // Check if the double value exceeds safe integer range
                if (doubleValue > MAX_SAFE_INTEGER || doubleValue < MIN_SAFE_INTEGER) {
                    logger.warn("JavaScript Number {} for parameter '{}' exceeds safe integer range (±2^53-1). " +
                               "Precision loss may occur. Consider using BigInt instead.", doubleValue, paramName);
                }
                
                // Check if the value is an integer
                if (doubleValue != Math.floor(doubleValue)) {
                    throw new IllegalArgumentException(paramName + " must be an integer, but got: " + doubleValue);
                }
                
                return (long) doubleValue;
            }
            
            // Handle BigInt by converting through string representation
            if (jsValue.isString()) {
                try {
                    return new BigInteger(jsValue.asString()).longValueExact();
                } catch (ArithmeticException e) {
                    throw new IllegalArgumentException(paramName + " value '" + jsValue.asString() + 
                                                     "' exceeds long range", e);
                }
            }
            
            throw new IllegalArgumentException(paramName + " must be a Number or BigInt, but got: " + 
                                             jsValue.getClass().getSimpleName());
            
        } catch (Exception e) {
            if (e instanceof IllegalArgumentException) {
                throw e;
            }
            throw new IllegalArgumentException("Failed to convert " + paramName + " to long: " + e.getMessage(), e);
        }
    }
    
    /**
     * Safely converts a JavaScript value to Java int.
     * 
     * @param jsValue JavaScript value (Number)
     * @param paramName Parameter name for error reporting
     * @return Java int value
     * @throws IllegalArgumentException if conversion fails
     */
    public static int safeConvertToInt(Value jsValue, String paramName) {
        if (jsValue == null) {
            throw new IllegalArgumentException(paramName + " cannot be null");
        }
        
        try {
            if (jsValue.fitsInInt()) {
                return jsValue.asInt();
            }
            
            if (jsValue.fitsInDouble()) {
                double doubleValue = jsValue.asDouble();
                
                // Check integer bounds
                if (doubleValue > Integer.MAX_VALUE || doubleValue < Integer.MIN_VALUE) {
                    throw new IllegalArgumentException(paramName + " value " + doubleValue + 
                                                     " exceeds integer range");
                }
                
                // Check if the value is an integer
                if (doubleValue != Math.floor(doubleValue)) {
                    throw new IllegalArgumentException(paramName + " must be an integer, but got: " + doubleValue);
                }
                
                return (int) doubleValue;
            }
            
            throw new IllegalArgumentException(paramName + " must be a Number, but got: " + 
                                             jsValue.getClass().getSimpleName());
            
        } catch (Exception e) {
            if (e instanceof IllegalArgumentException) {
                throw e;
            }
            throw new IllegalArgumentException("Failed to convert " + paramName + " to int: " + e.getMessage(), e);
        }
    }
    
    /**
     * Validates that a JavaScript Number is within safe integer range.
     * 
     * @param jsValue JavaScript Number value
     * @param paramName Parameter name for error reporting
     * @return true if safe, false otherwise
     */
    public static boolean isSafeInteger(Value jsValue, String paramName) {
        if (jsValue == null || !jsValue.fitsInDouble()) {
            return false;
        }
        
        double value = jsValue.asDouble();
        return value >= MIN_SAFE_INTEGER && value <= MAX_SAFE_INTEGER && 
               value == Math.floor(value);
    }
    
    /**
     * Wraps a JavaScript function call with proper error handling and type conversion.
     * 
     * @param jsFunction JavaScript function to call
     * @param args Arguments to pass to the function
     * @return CompletableFuture that resolves with the function result
     */
    public static CompletableFuture<Object> wrapJSFunctionCall(Value jsFunction, Object... args) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                if (!jsFunction.canExecute()) {
                    throw new IllegalArgumentException("Provided value is not a function");
                }
                
                Value result = jsFunction.execute(args);
                
                // Convert the result based on its type
                if (result.isBoolean()) {
                    return result.asBoolean();
                } else if (result.fitsInInt()) {
                    return result.asInt();
                } else if (result.fitsInLong()) {
                    return result.asLong();
                } else if (result.fitsInDouble()) {
                    return result.asDouble();
                } else if (result.isString()) {
                    return result.asString();
                } else if (result.isNull()) {
                    return null;
                } else {
                    // For complex objects, return the Value wrapper
                    return result;
                }
                
            } catch (Exception e) {
                logger.error("JavaScript function call failed", e);
                throw new RuntimeException("JavaScript function execution failed: " + e.getMessage(), e);
            }
        });
    }
    
    /**
     * Creates a type-safe wrapper for entity factory functions.
     * 
     * @param jsFunction JavaScript function that creates entities
     * @return TypeSafeEntityFactory wrapper
     */
    public static TypeSafeEntityFactory wrapEntityFactory(Value jsFunction) {
        if (!jsFunction.canExecute()) {
            throw new IllegalArgumentException("Entity factory must be a function");
        }
        
        return new TypeSafeEntityFactory(jsFunction);
    }
    
    /**
     * Creates a type-safe wrapper for block entity factory functions.
     * 
     * @param jsFunction JavaScript function that creates block entities
     * @return TypeSafeBlockEntityFactory wrapper
     */
    public static TypeSafeBlockEntityFactory wrapBlockEntityFactory(Value jsFunction) {
        if (!jsFunction.canExecute()) {
            throw new IllegalArgumentException("Block entity factory must be a function");
        }
        
        return new TypeSafeBlockEntityFactory(jsFunction);
    }
    
    /**
     * Type-safe wrapper for entity factory functions.
     */
    public static class TypeSafeEntityFactory {
        private final Value jsFunction;
        
        public TypeSafeEntityFactory(Value jsFunction) {
            this.jsFunction = jsFunction;
        }
        
        /**
         * Creates an entity using the wrapped JavaScript function.
         * 
         * @param entityType String representing the entity type
         * @param position Position object (implementation-specific)
         * @return Created entity or null if creation failed
         */
        public Object createEntity(String entityType, Object position) {
            try {
                Value result = jsFunction.execute(entityType, position);
                return result.isNull() ? null : result;
            } catch (Exception e) {
                logger.error("Entity factory function failed for type: {}", entityType, e);
                return null;
            }
        }
    }
    
    /**
     * Type-safe wrapper for block entity factory functions.
     */
    public static class TypeSafeBlockEntityFactory {
        private final Value jsFunction;
        
        public TypeSafeBlockEntityFactory(Value jsFunction) {
            this.jsFunction = jsFunction;
        }
        
        /**
         * Creates a block entity using the wrapped JavaScript function.
         * 
         * @param blockType String representing the block type
         * @param position Position object (implementation-specific)
         * @return Created block entity or null if creation failed
         */
        public Object createBlockEntity(String blockType, Object position) {
            try {
                Value result = jsFunction.execute(blockType, position);
                return result.isNull() ? null : result;
            } catch (Exception e) {
                logger.error("Block entity factory function failed for type: {}", blockType, e);
                return null;
            }
        }
    }
}
