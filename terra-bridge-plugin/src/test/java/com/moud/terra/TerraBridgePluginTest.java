package com.moud.terra;

import com.dfsek.terra.minestom.TerraMinestomWorldBuilder;
import com.moud.plugin.api.PluginContext;
import net.minestom.server.instance.Instance;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.HostAccess;
import org.graalvm.polyglot.Value;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for TerraBridgePlugin functionality.
 * Tests the bridge between Terra world generation and Moud's TypeScript runtime.
 */
@ExtendWith(MockitoExtension.class)
public class TerraBridgePluginTest {
    
    @Mock
    private PluginContext mockPluginContext;
    
    @Mock
    private Instance mockInstance;
    
    @Mock
    private Context mockGraalContext;
    
    @Mock
    private Value mockBindings;
    
    @Mock
    private Value mockValue;
    
    private TerraBridgePlugin plugin;
    
    @BeforeEach
    void setUp() {
        plugin = new TerraBridgePlugin();
        
        // Setup common mock behavior
        when(mockPluginContext.getGraalContext()).thenReturn(mockGraalContext);
        when(mockGraalContext.getBindings("js")).thenReturn(mockBindings);
    }
    
    @Test
    void testPluginInitialization() {
        // Arrange
        when(mockPluginContext.getServer()).thenReturn(mock(com.moud.plugin.api.Server.class));
        
        // Act & Assert
        assertDoesNotThrow(() -> plugin.initialize(mockPluginContext));
        assertNotNull(plugin.getPluginContext());
        assertEquals(mockPluginContext, plugin.getPluginContext());
    }
    
    @Test
    void testPluginInitializationWithNullContext() {
        // Act & Assert
        assertThrows(NullPointerException.class, () -> plugin.initialize(null));
    }
    
    @Test
    void testTerraFacadeCreation() {
        // Arrange
        TerraMinestomWorldBuilder mockBuilder = mock(TerraMinestomWorldBuilder.class);
        
        // Act
        TerraFacade facade = new TerraFacade(mockBuilder, mockInstance, mockPluginContext);
        
        // Assert
        assertNotNull(facade);
        assertDoesNotThrow(() -> facade.defaultPack());
        assertDoesNotThrow(() -> facade.packById("test"));
    }
    
    @Test
    void testTypeSafetyHandlerLongConversion() {
        // Test safe long conversion
        Value mockLongValue = mock(Value.class);
        when(mockLongValue.fitsInLong()).thenReturn(true);
        when(mockLongValue.asLong()).thenReturn(123456789L);
        
        long result = TypeSafetyHandler.safeConvertToLong(mockLongValue, "testParam");
        assertEquals(123456789L, result);
        
        // Test double conversion within safe range
        Value mockDoubleValue = mock(Value.class);
        when(mockDoubleValue.fitsInLong()).thenReturn(false);
        when(mockDoubleValue.fitsInDouble()).thenReturn(true);
        when(mockDoubleValue.asDouble()).thenReturn(42.0);
        
        result = TypeSafetyHandler.safeConvertToLong(mockDoubleValue, "testParam");
        assertEquals(42L, result);
        
        // Test unsafe double conversion
        Value mockUnsafeDouble = mock(Value.class);
        when(mockUnsafeDouble.fitsInLong()).thenReturn(false);
        when(mockUnsafeDouble.fitsInDouble()).thenReturn(true);
        when(mockUnsafeDouble.asDouble()).thenReturn(42.5); // Not an integer
        
        assertThrows(IllegalArgumentException.class, 
            () -> TypeSafetyHandler.safeConvertToLong(mockUnsafeDouble, "testParam"));
    }
    
    @Test
    void testTypeSafetyHandlerIntConversion() {
        // Test safe int conversion
        Value mockIntValue = mock(Value.class);
        when(mockIntValue.fitsInInt()).thenReturn(true);
        when(mockIntValue.asInt()).thenReturn(42);
        
        int result = TypeSafetyHandler.safeConvertToInt(mockIntValue, "testParam");
        assertEquals(42, result);
        
        // Test double conversion within int range
        Value mockDoubleValue = mock(Value.class);
        when(mockDoubleValue.fitsInInt()).thenReturn(false);
        when(mockDoubleValue.fitsInDouble()).thenReturn(true);
        when(mockDoubleValue.asDouble()).thenReturn(100.0);
        
        result = TypeSafetyHandler.safeConvertToInt(mockDoubleValue, "testParam");
        assertEquals(100, result);
        
        // Test double conversion exceeding int range
        Value mockOverflowDouble = mock(Value.class);
        when(mockOverflowDouble.fitsInInt()).thenReturn(false);
        when(mockOverflowDouble.fitsInDouble()).thenReturn(true);
        when(mockOverflowDouble.asDouble()).thenReturn(2147483648.0); // Integer.MAX_VALUE + 1
        
        assertThrows(IllegalArgumentException.class, 
            () -> TypeSafetyHandler.safeConvertToInt(mockOverflowDouble, "testParam"));
    }
    
    @Test
    void testSafeIntegerValidation() {
        // Test safe integer
        Value mockSafeInt = mock(Value.class);
        when(mockSafeInt.fitsInDouble()).thenReturn(true);
        when(mockSafeInt.asDouble()).thenReturn(42.0);
        
        assertTrue(TypeSafetyHandler.isSafeInteger(mockSafeInt, "testParam"));
        
        // Test unsafe integer (too large)
        Value mockUnsafeInt = mock(Value.class);
        when(mockUnsafeInt.fitsInDouble()).thenReturn(true);
        when(mockUnsafeInt.asDouble()).thenReturn(9007199254740992.0); // MAX_SAFE_INTEGER + 1
        
        assertFalse(TypeSafetyHandler.isSafeInteger(mockUnsafeInt, "testParam"));
        
        // Test non-integer
        Value mockNonInt = mock(Value.class);
        when(mockNonInt.fitsInDouble()).thenReturn(true);
        when(mockNonInt.asDouble()).thenReturn(42.5);
        
        assertFalse(TypeSafetyHandler.isSafeInteger(mockNonInt, "testParam"));
    }
    
    @Test
    void testEntityFactoryWrapper() {
        // Arrange
        Value mockFunction = mock(Value.class);
        when(mockFunction.canExecute()).thenReturn(true);
        when(mockFunction.execute(any())).thenReturn(mockValue);
        
        // Act
        TypeSafetyHandler.TypeSafeEntityFactory factory = 
            TypeSafetyHandler.wrapEntityFactory(mockFunction);
        
        // Assert
        assertNotNull(factory);
        assertDoesNotThrow(() -> factory.createEntity("zombie", mock(Object.class)));
        
        // Test with non-function value
        Value mockNonFunction = mock(Value.class);
        when(mockNonFunction.canExecute()).thenReturn(false);
        
        assertThrows(IllegalArgumentException.class, 
            () -> TypeSafetyHandler.wrapEntityFactory(mockNonFunction));
    }
    
    @Test
    void testBlockEntityFactoryWrapper() {
        // Arrange
        Value mockFunction = mock(Value.class);
        when(mockFunction.canExecute()).thenReturn(true);
        when(mockFunction.execute(any())).thenReturn(mockValue);
        
        // Act
        TypeSafetyHandler.TypeSafeBlockEntityFactory factory = 
            TypeSafetyHandler.wrapBlockEntityFactory(mockFunction);
        
        // Assert
        assertNotNull(factory);
        assertDoesNotThrow(() -> factory.createBlockEntity("chest", mock(Object.class)));
        
        // Test with non-function value
        Value mockNonFunction = mock(Value.class);
        when(mockNonFunction.canExecute()).thenReturn(false);
        
        assertThrows(IllegalArgumentException.class, 
            () -> TypeSafetyHandler.wrapBlockEntityFactory(mockNonFunction));
    }
    
    @Test
    void testJSFunctionCallWrapper() {
        // Arrange
        Value mockFunction = mock(Value.class);
        when(mockFunction.canExecute()).thenReturn(true);
        when(mockFunction.execute(any())).thenReturn(mockValue);
        when(mockValue.isBoolean()).thenReturn(true);
        when(mockValue.asBoolean()).thenReturn(true);
        
        // Act
        var future = TypeSafetyHandler.wrapJSFunctionCall(mockFunction, "arg1", "arg2");
        
        // Assert
        assertNotNull(future);
        assertDoesNotThrow(() -> future.get());
        
        // Test with non-function
        Value mockNonFunction = mock(Value.class);
        when(mockNonFunction.canExecute()).thenReturn(false);
        
        var errorFuture = TypeSafetyHandler.wrapJSFunctionCall(mockNonFunction);
        assertThrows(RuntimeException.class, () -> errorFuture.get());
    }
    
    @Test
    void testTerraBuilderWrapperSeedSetting() {
        // Arrange
        TerraMinestomWorldBuilder mockBuilder = mock(TerraMinestomWorldBuilder.class);
        TerraFacade.TerraBuilderWrapper wrapper = 
            new TerraFacade.TerraBuilderWrapper(mockBuilder, mockInstance, mockPluginContext);
        
        // Test with long value
        Value mockLongValue = mock(Value.class);
        when(mockLongValue.fitsInLong()).thenReturn(true);
        when(mockLongValue.asLong()).thenReturn(123456789L);
        
        // Act & Assert
        assertDoesNotThrow(() -> wrapper.seed(mockLongValue));
        
        // Test with double value
        Value mockDoubleValue = mock(Value.class);
        when(mockDoubleValue.fitsInLong()).thenReturn(false);
        when(mockDoubleValue.fitsInDouble()).thenReturn(true);
        when(mockDoubleValue.asDouble()).thenReturn(42.0);
        
        assertDoesNotThrow(() -> wrapper.seed(mockDoubleValue));
        
        // Test with invalid value
        Value mockInvalidValue = mock(Value.class);
        when(mockInvalidValue.fitsInLong()).thenReturn(false);
        when(mockInvalidValue.fitsInDouble()).thenReturn(false);
        
        assertThrows(IllegalArgumentException.class, () -> wrapper.seed(mockInvalidValue));
    }
    
    @Test
    void testTerraBuilderWrapperEntityFactory() {
        // Arrange
        TerraMinestomWorldBuilder mockBuilder = mock(TerraMinestomWorldBuilder.class);
        TerraFacade.TerraBuilderWrapper wrapper = 
            new TerraFacade.TerraBuilderWrapper(mockBuilder, mockInstance, mockPluginContext);
        
        Value mockFunction = mock(Value.class);
        when(mockFunction.canExecute()).thenReturn(true);
        
        // Act & Assert
        assertDoesNotThrow(() -> wrapper.entityFactory(mockFunction));
        
        // Test with non-function
        Value mockNonFunction = mock(Value.class);
        when(mockNonFunction.canExecute()).thenReturn(false);
        
        assertThrows(IllegalArgumentException.class, () -> wrapper.entityFactory(mockNonFunction));
    }
    
    @Test
    void testTerraBuilderWrapperBlockEntityFactory() {
        // Arrange
        TerraMinestomWorldBuilder mockBuilder = mock(TerraMinestomWorldBuilder.class);
        TerraFacade.TerraBuilderWrapper wrapper = 
            new TerraFacade.TerraBuilderWrapper(mockBuilder, mockInstance, mockPluginContext);
        
        Value mockFunction = mock(Value.class);
        when(mockFunction.canExecute()).thenReturn(true);
        
        // Act & Assert
        assertDoesNotThrow(() -> wrapper.blockEntityFactory(mockFunction));
        
        // Test with non-function
        Value mockNonFunction = mock(Value.class);
        when(mockNonFunction.canExecute()).thenReturn(false);
        
        assertThrows(IllegalArgumentException.class, () -> wrapper.blockEntityFactory(mockNonFunction));
    }
    
    @Test
    void testPluginShutdown() {
        // Arrange
        plugin.initialize(mockPluginContext);
        
        // Act & Assert
        assertDoesNotThrow(() -> plugin.shutdown());
    }
}
